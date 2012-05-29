# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog. Released under GPL.

import os

from flask import Flask, render_template


class default_settings:
    DEBUG = False
    
    # httpkom server, without trailing slash (example: 'http://localhost:5001')
    HTTPKOM_SERVER = 'http://localhost:5001'


app = Flask(__name__)
app.config.from_object(default_settings)
if 'JSKOM_SETTINGS' in os.environ:
    app.config.from_envvar('JSKOM_SETTINGS')
else:
    app.logger.info("No environment variable JSKOM_SETTINGS found, using default settings.")


@app.route("/", defaults={ 'path': '' })
@app.route("/<path:path>")
def index(path):
    # pth is for html5 push state
    return render_template('index.html', httpkom_server=app.config['HTTPKOM_SERVER'])
