# -*- coding: utf-8 -*-

from flask import Flask, render_template


app = Flask("jskom")


@app.route("/jskom/", defaults={'path': '' })
@app.route("/jskom/<path:path>")
def jskom(path):
    # pth is for html5 push state
    return render_template('index.html')
