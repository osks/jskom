# -*- coding: utf-8 -*-

from flask import Flask, render_template


app = Flask("jskom")


# httpkom server, without trailing slash (example: 'http://localhost:5001')
httpkom_server = 'http://localhost:5001'


@app.route("/", defaults={'path': '' })
@app.route("/<path:path>")
def jskom(path):
    # pth is for html5 push state
    return render_template('index.html', httpkom_server=httpkom_server)
