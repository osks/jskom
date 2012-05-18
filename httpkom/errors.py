# -*- coding: utf-8 -*-

from flask import jsonify, make_response, Response

import kom
from komsession import KomSessionError

from flaskapp import app
from misc import empty_response


_kom_error_code_dict = dict([v,k] for k,v in kom.error_dict.items())


def _kom_error_to_error_code(ex):
    return _kom_error_code_dict[ex.__class__]

def error_response(status_code, kom_error=None, error_msg=""):
    # TODO: I think we need to unify these error types to make the API
    # easier. Perhaps use protocol a error codes as they are, and
    # add our own httpkom error codes on 1000 and above?
    if kom_error is not None:
        response = jsonify(error_code=_kom_error_to_error_code(kom_error),
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

@app.errorhandler(500)
def internalservererror(error):
    return error_response(500, error_msg=str(error))

@app.errorhandler(404)
def notfound(error):
    return empty_response(404)

@app.errorhandler(kom.Error)
def kom_error(error):
    return error_response(400, kom_error=error)

@app.errorhandler(KomSessionError)
def komsession_error(error):
    return error_response(400, error_msg=str(error))
