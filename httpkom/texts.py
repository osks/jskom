# -*- coding: utf-8 -*-

from flask import g, request, jsonify

import kom
from komsession import KomSession, KomSessionError, KomText, to_dict, from_dict
from flaskapp import app
from errors import error_response
from misc import empty_response
from sessions import requires_session


# curl -b cookies.txt -c cookies.txt -v \
#      -X GET http://localhost:5000/texts/19680717
@app.route('/texts/<int:text_no>')
@requires_session
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
@requires_session
def create_text():
    #app.logger.debug(request.json)
    
    komtext = from_dict(request.json, KomText, True, g.ksession)
    text_no = g.ksession.create_text(komtext)
    return jsonify(text_no=text_no)


        

# curl -b cookies.txt -c cookies.txt -v \
#      -X PUT http://localhost:5000/texts/19680717/read-marking
@app.route('/texts/<int:text_no>/read-marking', methods=['PUT', 'DELETE'])
@requires_session
def text_read_marking(text_no):
    # Mark text as read in all recipient conferences
    
    if request.method == 'PUT':
        g.ksession.mark_as_read(text_no)
        return empty_response(204)
    elif request.method == 'DELETE':
        raise NotImplementedError()
