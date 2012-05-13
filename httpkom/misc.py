# -*- coding: utf-8 -*-

from flask import request, Response, abort


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

def empty_response(status, headers=None):
    response = Response("", status=status, headers=headers)
    del response.headers['Content-Type'] # text/html by default in Flask
    return response
