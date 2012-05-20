# -*- coding: utf-8 -*-

from flask import Flask, render_template


class default_settings:
    # httpkom server, without trailing slash (example: 'http://localhost:5001')
    HTTPKOM_SERVER = 'http://localhost:5001'


app = Flask(__name__)
app.config.from_object(default_settings)
app.config.from_envvar('JSKOM_SETTINGS')


@app.route("/", defaults={ 'path': '' })
@app.route("/<path:path>")
def index(path):
    # pth is for html5 push state
    app.logger.debug(app.config)
    return render_template('index.html', httpkom_server=app.config['HTTPKOM_SERVER'])
