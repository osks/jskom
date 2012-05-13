# -*- coding: utf-8 -*-

from flask import render_template

from flaskapp import app

# Load app parts
import conferences
import sessions
import texts
import jskom


@app.route("/")
def index():
    return render_template('index.html')

@app.route("/status")
def status():
    return render_template('status.html', kom_sessions=sessions.kom_sessions)
