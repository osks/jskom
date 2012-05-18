# Threaded extension to Kent's Protocol A interface
# $Id#
# (C) Copyright 1999 Peter Liljenberg, released under GPL

# The extention works as follows:
#
# When creating a ThreadedConnection, a new thread is spawned
# that talks with the server.  All requests are sent in the same
# way as for the vanilla Connection class.  However, when you use the
# response() method of the request, the calling thread will block until
# the server thread has received the response from the server.
#
# Asynchronous message handlers are called in a new thread (for
# each async message) when they are recieved by the server thread.
# Additionally, a handler may be a Queue.Queue object.  In this case
# a tuple (message, connection) is put on the queue, where it can be
# retrieved by some other thread.  The server thread assumes that no
# other thread will put objects on the queue.  If this happens and the
# queue is filled (we're talking a really tiny critical window here), the
# server thread may block waiting for the queue to become non-full.  This
# could theoretically cause a deadlock.  So: don't put things on the
# queue yourself, or use queues of infinite site.

import kom
import thread
import Queue

class ThreadedConnection(kom.CachedUserConnection):
    def __init__(self, host, port = 4894, user = ""):
        self.send_lock = thread.allocate_lock()
        self.async_lock = thread.allocate_lock()
        self.request_lock = thread.allocate_lock()
        self.lock_queue = {}
        kom.CachedUserConnection.__init__(self, host, port, user)
        self.continue_read_loop = True
        thread.start_new_thread(self.read_loop, ())

    def add_async_handler(self, msg_no, handler):
        self.async_lock.acquire()
        kom.CachedUserConnection.add_async_handler(self, msg_no, handler)
        self.async_lock.release()

    def register_request(self, req):
        self.request_lock.acquire()
        req_id = self.req_id = self.req_id +1
        self.req_queue[req_id] = req
        self.lock_queue[req_id] = thread.allocate_lock()
        self.lock_queue[req_id].acquire()      
        self.request_lock.release()
        #print "REQUEST %s REGISTERED" % req
        return req_id
    
    def wait_and_dequeue(self, id):
        self.lock_queue[id].acquire()
        del self.lock_queue[id]
        
        if id in self.resp_queue:
            # Response
            ret = self.resp_queue[id]
            del self.resp_queue[id]
            return ret
        else:
            # Error
            (error_no, error_status) = self.error_queue[id]
            del self.error_queue[id]
            raise kom.error_dict[error_no](error_status)

    def read_loop(self):
        while self.continue_read_loop:
            try:
                self.parse_server_message()
            except kom.ReceiveError:
                return
            except socket.error:
                return

    # Parse response
    def parse_response(self):
        id = self.parse_int()
        #print "Response for",id,"coming"
        self.request_lock.acquire()
        if id in self.req_queue:
            self.request_lock.release()
            # Delegate parsing to the ReqXXXX class
            resp = self.req_queue[id].parse_response()
            # Remove request and add response
            del self.req_queue[id]
            self.resp_queue[id] = resp
            self.lock_queue[id].release()
        else:
            self.request_lock.release()
            raise BadRequestId(id)

    # Parse error
    def parse_error(self):
        id = self.parse_int()
        error_no = self.parse_int()
        error_status = self.parse_int()
        self.request_lock.acquire()
        if id in self.req_queue:
            self.request_lock.release()
            # Remove request and add error
            del self.req_queue[id]
            self.error_queue[id] = (error_no, error_status)
            self.lock_queue[id].release()
        else:
            self.request_lock.release()
            raise BadRequestId(id)

    # Parse asynchronous message
    def parse_asynchronous_message(self):
        no_args = self.parse_int()
        msg_no = self.parse_int()

        if msg_no in kom.async_dict:
            msg = kom.async_dict[msg_no]()
            msg.parse(self)
            self.async_lock.acquire()
            if msg_no in self.async_handlers:
                for handler in self.async_handlers[msg_no]:
  
                    # We allow handlers to be queues as well
                    if isinstance(handler, Queue.Queue):
                        # If the queue may be full, start a new thread
                        # to add the message to the queue.
                        # As only we should put items on the queue, we
                        # don't risk that the queue should be full after
                        # the check, so we're never blocking when putting.
                        if handler.full():
                            thread.start_new_thread(handler.put, ((msg, self),))
                        else:
                            handler.put((msg, self))
                    # The ordinary function, but start is as a new thread
                    else:
                        thread.start_new_thread(handler, (msg, self))
            self.async_lock.release()
        else:
            raise UnimplementedAsync(msg_no)
        
    def send_string(self, s):
        #print(">>>",s)
        self.send_lock.acquire()
        self.socket.send(s)
        self.send_lock.release()
