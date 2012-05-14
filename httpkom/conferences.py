# -*- coding: utf-8 -*-

from flask import g, request, jsonify

import kom
from komsession import KomSession, KomSessionError, KomText, to_dict, from_dict
from flaskapp import app
from errors import error_response
from misc import empty_response, get_bool_arg_with_default
from sessions import requires_session


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/?unread=true&full=true
@app.route('/conferences/')
@requires_session
def conferences_list():
    full = get_bool_arg_with_default(request.args, 'full', False)
    unread = get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        return jsonify(confs=to_dict(g.ksession.get_conferences(unread, full),
                                     True, g.ksession))
    else:
        abort(400) # nothing else is implemented


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/unread/
@app.route('/conferences/unread/')
@requires_session
def conferences_list_unread():
    # this always return confs i "micro format" and has no_of_unread defined, which
    # /conferences/ does not.
    return jsonify(confs=to_dict(g.ksession.get_unread_conferences(),
                                 False, g.ksession))


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/14506
@app.route('/conferences/<int:conf_no>')
@requires_session
def conferences_get(conf_no):
    try:
        micro = get_bool_arg_with_default(request.args, 'micro', True)
        return jsonify(to_dict(g.ksession.get_conference(conf_no, micro),
                               True, g.ksession))
    except kom.UndefinedConference as ex:
        return error_response(404, kom_error=ex)


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/conferences/14506/read-markings/?unread=true
@app.route('/conferences/<int:conf_no>/read-markings/')
@requires_session
def conferences_get_read_markings(conf_no):
    # Return read-markings. Mostly used with ?unread=true to return
    # unread texts in the given conference.
    # Other functions would be to return 
    
    unread = get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        # TODO: return local_text_no as well
        return jsonify(rms=[ dict(conf_no=conf_no, text_no=text_no, unread=unread)
                             for text_no in g.ksession.\
                                 get_unread_in_conference(conf_no) ])
        
        #return jsonify(text_nos=to_dict(
        #        g.ksession.get_unread_in_conference(conf_no), True, g.ksession))
    else:
        raise NotImplementedError()


# curl -b cookies.txt -c cookies.txt -v \
#      -X PUT http://localhost:5000/conferences/14506/texts/29/read-marking
@app.route('/conferences/<int:conf_no>/texts/<int:local_text_no>/read-marking',
           methods=['PUT'])
@requires_session
def conferences_put_text_read_marking(conf_no, local_text_no):
    # Mark text as read in the specified recipient conference
    
    g.ksession.mark_as_read_local(local_text_no, conf_no)
    return empty_response(204)


# curl -b cookies.txt -c cookies.txt -v \
#      -X DELETE http://localhost:5000/conferences/14506/texts/29/read-marking
@app.route('/conferences/<int:conf_no>/texts/<int:local_text_no>/read-marking',
           methods=['DELETE'])
@requires_session
def conferences_delete_text_read_marking(conf_no, local_text_no):
    # Mark text as unread in the specified recipient conference
    
    raise NotImplementedError()


# TODO: would be nice with GET for read markings as well
