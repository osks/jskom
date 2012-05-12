#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import random
import sys
import json
import functools
import uuid

import mimeparse

from flask import Flask, g, abort, request, jsonify, make_response, \
    render_template, Response, url_for

import kom
import komauxitems
from komsession import KomSession, KomSessionError, KomText, to_dict, from_dict


app = Flask("httpkom")

kom_server = 'kom.lysator.liu.se'
kom_sessions = {}
kom_error_code_dict = dict([v,k] for k,v in kom.error_dict.items())



def get_bool_arg_with_default(args, arg, default):
    if arg in request.args:
        if request.args[arg] == 'false':
            val = False
        elif request.args[arg] == 'true':
            val = True
        else:
            abort(400)
    else:
        val = default
    return val

def kom_error_to_error_code(ex):
    return kom_error_code_dict[ex.__class__]



def requires_login(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        g.ksession = _get_komsession(_get_session_id())
        if g.ksession:
            return f(*args, **kwargs)
        
        return empty_response(401)
    return decorated

def _create_komsession(username, password):
    ksession = KomSession(kom_server)
    ksession.connect()
    try:
        ksession.login(username, password)
        # todo: check for exceptions that we should return 401 for. or
        # should that be done here? we don't want to return http stuff here
    except:
        ksession.disconnect()
        raise
    return ksession

def _save_komsession(ksession):
    session_id = str(uuid.uuid4())
    kom_sessions[session_id] = ksession
    return session_id

def _destroy_komsession():
    if 'session_id' in request.cookies:
        session_id = request.cookies.get('session_id')
        if session_id in kom_sessions:
            del kom_sessions[session_id]

def _get_session_id():
    if 'session_id' in request.cookies:
        return request.cookies.get('session_id')
    return None

def _get_komsession(session_id):
    if session_id is not None:
        if session_id in kom_sessions:
            return kom_sessions[session_id]
    
    return None

def _login(username, password):
    app.logger.debug("Logging in")
    ksession = _create_komsession(username, password)
    session_id = _save_komsession(ksession)
    return session_id, ksession

def _logout(ksession):
    app.logger.debug("Logging out")
    try:
        ksession.logout()
        ksession.disconnect()
    finally:
        _destroy_komsession()
    

def empty_response(status, headers=None):
    response = Response("", status=status, headers=headers)
    del response.headers['Content-Type'] # text/html by default in Flask
    return response

def error_response(status_code, kom_error=None, error_msg=""):
    # TODO: I think we need to unify these error types to make the API
    # easier. Perhaps use protocol a error codes as they are, and
    # add our own httpkom error codes on 1000 and above?
    if kom_error is not None:
        response = jsonify(error_code=kom_error_to_error_code(kom_error),
                           error_status=str(kom_error),
                           error_type="protocol-a",
                           error_msg=str(kom_error.__class__.__name__))
    else:
        # We don't have any fancy error codes for httpkom yet.
        response = jsonify(error_type="httpkom",
                           error_msg=error_msg)
    
    response.status_code = status_code
    return response



@app.errorhandler(400)
def badrequest(error):
    return empty_response(400)

@app.errorhandler(404)
def notfound(error):
    return empty_response(404)

@app.errorhandler(kom.Error)
def kom_error(error):
    return error_response(400, kom_error=error)

@app.errorhandler(KomSessionError)
def komsession_error(error):
    return error_response(400, error_msg=str(error))



@app.route("/jskom/", defaults={'path': '' })
@app.route("/jskom/<path:path>")
def jskom(path):
    # pth is for html5 push state
    return render_template('jskom.html')



@app.route("/")
def index():
    return render_template('index.html')

@app.route("/status")
def status():
    return render_template('status.html', kom_sessions=kom_sessions)
    

@app.route("/sessions/", methods=['POST'])
def create_session():
    """Create a new session (i.e. login).
    
    Request::
    
      POST /sessions/ HTTP/1.1
      
      { "username": "oskars testperson", "password": "test123" }
    
    Responses:
    
    Successful login::
    
      HTTP/1.1 200 OK
      Set-Cookie: session_id=abc123; expires=Sat, 19-May-2012 12:44:51 GMT; Max-Age=604800; Path=/
      
      { "pers_no": 14506, ... }
    
    Failed login::
    
      HTTP/1.1 401 Unauthorized
      
      { TODO: error stuff }
    
    Example::
    
      curl -b cookies.txt -c cookies.txt -v \\
           -X POST -H "Content-Type: application/json" \\
           -d '{ "username": "Oskars testperson", "password": "test123" }' \\
            http://localhost:5000/sessions/
    
    """
    old_ksession = _get_komsession(_get_session_id())
    if old_ksession:
        # already loggedin, logout first, then try to login with the
        # supplied credentials.
        _logout(old_ksession)
    
    session_id, ksession = _login(request.json['username'], request.json['password'])
    response = jsonify(dict(id=session_id, pers_no=ksession.current_user()))
    response.set_cookie('session_id', value=session_id, max_age=7*24*60*60)
    return response


@app.route("/sessions/<string:session_id>")
def get_session(session_id):
    """Get information about a session. Usable for checking if your
    session is still valid.
    
    Request::
    
      GET /sessions/abc123 HTTP/1.1
    
    Responses:
    
    Session exists (i.e. logged in)::
    
      HTTP/1.1 200 OK
      
      { "id": "abc123", "pers_no": 14506, ... }

    Session does not exist (i.e. not logged in)::
    
      HTTP/1.1 404 Not Found
    
    Example::
    
      curl -b cookies.txt -c cookies.txt -v \\
           -X GET http://localhost:5000/sessions/abc123
    
    """
    session_id = _get_session_id()
    ksession = _get_komsession(session_id)
    if ksession:
        return jsonify(dict(id=session_id, pers_no=ksession.current_user()))
    else:
        return empty_response(404)


@app.route("/sessions/<string:session_id>", methods=['DELETE'])
def delete_session(session_id):
    """Delete a session (i.e. logout).
    
    Request::
    
      DELETE /sessions/abc123 HTTP/1.1
    
    Responses:
    
    Session exist::
    
      HTTP/1.1 204 No Content
    
    Session does not exist::
    
      HTTP/1.1 404 Not Found
      Set-Cookie: session_id=; expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/
    
    Example::
    
      curl -b cookies.txt -c cookies.txt -v \\
           -X DELETE http://localhost:5000/sessions/abc123
    
    """
    ksession = _get_komsession(session_id)
    if ksession:
        _logout(ksession)
        response = empty_response(204)
        response.set_cookie('session_id', value='', expires=0)
        return response
    else:
        return empty_response(404)
    


"""
NOT IMPLEMENTED.

(IDEA) Kolla vem man är inloggad som (använder session_id i cookien, latmask-funktion):
  GET /sessions/whoami

    Inloggad:
      303
      Location: /session/abc123
"""
def whoami_session():
    pass


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/texts/19680717
@app.route('/texts/<int:text_no>')
@requires_login
def get_text(text_no):
    try:
        app.logger.debug(text_no)
        return jsonify(to_dict(g.ksession.get_text(text_no), True, g.ksession))
    except kom.NoSuchText as ex:
        return error_response(404, kom_error=ex)


# TODO: Handle images. Add something like /texts/<int:text_no>/body
# that returns the body of a text in the HTTP body, with the
# content-type from the aux-item in the HTTP header. This means we
# could use a text with an image in it just like a normal image, and
# use the URL in an img-tag.


# curl -b cookies.txt -c cookies.txt -v \
#      -X POST -H "Content-Type: application/json" \
#      -d '{"body": "räksmörgås", "subject": "jaha", \
#           "recipient_list": [ { "recpt": { "conf_no": 14506 }, "type": "to" } ], \
#           "content_type": "text/x-kom-basic", \
#           "comment_to_list": [ { "type": "footnote", "text_no": 19675793 } ] }' \
#      http://localhost:5000/texts/
@app.route('/texts/', methods=['POST'])
@requires_login
def create_text():
    #app.logger.debug(request.json)
    
    komtext = from_dict(request.json, KomText, True, g.ksession)
    text_no = g.ksession.create_text(komtext)
    return jsonify(text_no=text_no)


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/?unread=true
@app.route('/conferences/')
@requires_login
def get_conferences():
    micro = get_bool_arg_with_default(request.args, 'micro', True)
    unread = get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        return jsonify(confs=to_dict(g.ksession.get_conferences(unread, micro),
                                     True, g.ksession))
    else:
        abort(400) # nothing else is implemented


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/unread/
@app.route('/conferences/unread/')
@requires_login
def get_conferences_unread():
    return jsonify(confs=to_dict(g.ksession.get_unread_conferences(),
                                 True, g.ksession))


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/14506
@app.route('/conferences/<int:conf_no>')
@requires_login
def get_conference(conf_no):
    try:
        micro = get_bool_arg_with_default(request.args, 'micro', True)
        return jsonify(to_dict(g.ksession.get_conference(conf_no, micro),
                               True, g.ksession))
    except kom.UndefinedConference as ex:
        return error_response(404, kom_error=ex)


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/14506/read-markings?unread=true
@app.route('/conferences/<int:conf_no>/read-markings')
@requires_login
def get_conference_read_markings(conf_no):
    # Return read-markings. Mostly used with ?unread=true to return
    # unread texts in the given conference.
    # Other functions would be to return 
    
    unread = get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        return jsonify(text_nos=to_dict(
                g.ksession.get_unread_in_conference(conf_no), True, g.ksession))
    else:
        abort(404) # not implemented


# curl -b cookies.txt -c cookies.txt -v \
#      -X PUT http://localhost:5000/conferences/14506/texts/29/read-marking
@app.route('/conferences/<int:conf_no>/texts/<int:local_text_no>/read-marking',
           methods=['PUT', 'DELETE'])
@requires_login
def conference_text_read_marking(conf_no, local_text_no):
    # Mark text as read in the specified recipient conference
    
    if request.method == 'PUT':
        g.ksession.mark_as_read_local(local_text_no, conf_no)
        return empty_response(204)
    elif request.method == 'DELETE':
        raise NotImplementedError()
        

# curl -b cookies.txt -c cookies.txt -v \
#      -X PUT http://localhost:5000/texts/19680717/read-marking
@app.route('/texts/<int:text_no>/read-marking', methods=['PUT', 'DELETE'])
@requires_login
def text_read_marking(text_no):
    # Mark text as read in all recipient conferences
    
    if request.method == 'PUT':
        g.ksession.mark_as_read(text_no)
        return empty_response(204)
    elif request.method == 'DELETE':
        raise NotImplementedError()



if __name__ == "__main__":
    app.debug = True
    app.run()
