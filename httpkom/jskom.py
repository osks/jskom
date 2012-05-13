# -*- coding: utf-8 -*-

from flask import render_template

from flaskapp import app


@app.route("/jskom/", defaults={'path': '' })
@app.route("/jskom/<path:path>")
def jskom(path):
    # pth is for html5 push state
    return render_template('jskom.html')
