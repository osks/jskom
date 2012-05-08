#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import random
import sys
import json
import mimeparse

from flask import Flask, abort, request, jsonify, session, make_response, render_template

import kom
import komauxitems
from komsession import KomSession, KomSessionError, KomText, to_dict, from_dict


app = Flask("httpkom")


kom_server = 'kom.lysator.liu.se'

kom_sessions = {}

kom_error_code_dict = dict([v,k] for k,v in kom.error_dict.items())

def kom_error_to_error_code(ex):
    return kom_error_code_dict[ex.__class__]


def create_session(ksession):
    session_id = "%X" % random.randint(0, sys.maxsize)
    kom_sessions[session_id] = ksession
    session['session_id'] = session_id
    return session_id

def destroy_session():
    if 'session_id' in session:
        session_id = session.pop('session_id')
        if session_id in kom_sessions:
            del kom_sessions[session_id]

def validate_session():
    if 'session_id' in session:
        session_id = session.get('session_id')
        if session_id in kom_sessions:
            return kom_sessions[session_id]
        else:
            session.pop('session_id') # invalid session cookie, delete it
    return None


def empty_response(status_code):
    response = make_response("")
    del response.headers['Content-Type'] # text/html by default in Flask
    response.status_code = status_code
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

@app.errorhandler(403)
def forbidden(error):
    return empty_response(403)

@app.errorhandler(404)
def notfound(error):
    return empty_response(404)

@app.errorhandler(kom.Error)
def kom_error(error):
    return error_response(400, kom_error=error)

@app.errorhandler(KomSessionError)
def komsession_error(error):
    return error_response(400, error_msg=str(error))


@app.route("/status")
def status():
    return render_template('status.html', kom_sessions=kom_sessions)


# curl -b cookies.txt -c cookies.txt -v \
#      -X POST -H "Content-Type: application/json" \
#      -d '{ "username": "Oskars testperson", "password": "test123" }' \
#      http://localhost:5000/auth/login
@app.route("/auth/login", methods=['POST'])
def login():
    if validate_session():
        return empty_response(204) # what should we return when already logged in?
    
    ksession = KomSession(kom_server)
    ksession.connect()
    try:
        ksession.login(request.json['username'], request.json['password'])
        create_session(ksession)
    except:
        ksession.disconnect()
        raise
    
    return empty_response(204)


@app.route("/auth/logout", methods=['POST'])
def logout():
    ksession = validate_session()
    if ksession:
        try:
            ksession.logout()
            ksession.disconnect()
        finally:
            destroy_session()
        return empty_response(204)
    else:
        abort(403)


@app.route('/texts/<int:text_no>')
def get_text(text_no):
    ksession = validate_session()
    if not ksession:
        abort(403)

    try:
        return jsonify(to_dict(ksession.get_text(text_no), True, ksession))
    except kom.NoSuchText as ex:
        return error_response(404, kom_error=ex)


# curl -b cookies.txt -c cookies.txt -v \
#      -X POST -H "Content-Type: application/json" \
#      -d '{"body": "räksmörgås", "subject": "jaha", \
#           "recipient_list": [ { "recpt": { "conf_no": 14506 }, "type": "to" } ], \
#           "content_type": "text/x-kom-basic", \
#           "comment_to_list": [ { "type": "footnote", "text_no": 19675793 } ] }' \
#      http://localhost:5000/texts
@app.route('/texts/', methods=['POST'])
def create_text():
    ksession = validate_session()
    if not ksession:
        abort(403)
    
    #app.logger.debug(request.json)
    
    komtext = from_dict(request.json, KomText, True, ksession)
    text_no = ksession.create_text(komtext)
    return jsonify(text_no=text_no)


@app.route('/conferences/')
def get_conferences():
    ksession = validate_session()
    if not ksession:
        abort(403)
    
    micro = _get_bool_arg_with_default(request.args, 'micro', True)
    unread = _get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        return jsonify(confs=to_dict(ksession.get_conferences(unread, micro),
                                     True, ksession))
    else:
        abort(400) # nothing else is implemented


@app.route('/conferences/<int:conf_no>')
def get_conference(conf_no):
    ksession = validate_session()
    if not ksession:
        abort(403)

    try:
        micro = _get_bool_arg_with_default(request.args, 'micro', True)
        return jsonify(to_dict(ksession.get_conference(conf_no, micro),
                                          True, ksession))
    except kom.UndefinedConference as ex:
        return error_response(404, kom_error=ex)


@app.route('/conferences/<int:conf_no>/read-markings')
def get_conference_read_markings(conf_no):
    # Return read-markings. Mostly used with ?unread=true to return
    # unread texts in the given conference.
    # Other functions would be to return 
    
    ksession = validate_session()
    if not ksession:
        abort(403)
    
    unread = _get_bool_arg_with_default(request.args, 'unread', False)
    
    if unread:
        return jsonify(text_nos=to_dict(
                ksession.get_unread_in_conference(conf_no), True, ksession))
    else:
        abort(404) # not implemented


@app.route('/conferences/<int:conf_no>/texts/<int:local_text_no>/read-marking',
           methods=['PUT', 'DELETE'])
def conference_text_read_marking(conf_no, local_text_no):
    # Mark text as read in the specified recipient conference
    ksession = validate_session()
    if not ksession:
        abort(403)
    
    if request.method == 'PUT':
        ksession.mark_as_read_local(local_text_no, conf_no)
        return empty_response(204)
    elif request.method == 'DELETE':
        raise NotImplementedError()
        

@app.route('/texts/<int:text_no>/read-marking', methods=['PUT', 'DELETE'])
def text_read_marking(text_no):
    # Mark text as read in all recipient conferences
    ksession = validate_session()
    if not ksession:
        abort(403)
    
    if request.method == 'PUT':
        ksession.mark_as_read(text_no)
        return empty_response(204)
    elif request.method == 'DELETE':
        raise NotImplementedError()



def _get_bool_arg_with_default(args, arg, default):
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
    


if __name__ == "__main__":
    # We randomize a new secret key for sessions each time. Because
    # our LysKOM sessions can't survive a restart, there is no reason
    # for our HTTP session cookies to do so.
    app.secret_key = os.urandom(32)
    
    app.debug = True
    app.run()
