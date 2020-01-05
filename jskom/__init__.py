# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog.

import os
import logging
from logging.handlers import TimedRotatingFileHandler

from flask import Flask, render_template, send_from_directory
from flask_assets import Environment, Bundle

from . import version


class default_settings:
    DEBUG = False
    LOG_FILE = None
    LOG_LEVEL = logging.WARNING

    SEND_FILE_MAX_AGE_DEFAULT = 0
    
    STATIC_VERSION = ''
    
    # httpkom server, without trailing slash (example: 'http://127.0.0.1:5001')
    HTTPKOM_SERVER = 'http://127.0.0.1:5001'
    HTTPKOM_CONNECTION_HEADER = 'Httpkom-Connection'


app = Flask(__name__)
app.config.from_object(default_settings)
if 'JSKOM_SETTINGS' in os.environ:
    app.config.from_envvar('JSKOM_SETTINGS')
else:
    app.logger.info("No environment variable JSKOM_SETTINGS found, using default settings.")


if not app.debug and app.config['LOG_FILE'] is not None:
    # keep 7 days of logs, rotated every midnight
    file_handler = TimedRotatingFileHandler(
        app.config['LOG_FILE'], when='midnight', interval=1, backupCount=7)
    
    file_handler.setFormatter(logging.Formatter(
           '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d]'
            ))
    
    file_handler.setLevel(app.config['LOG_LEVEL'])
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(app.config['LOG_LEVEL'])
    app.logger.info("Finished setting up file logger.");


assets = Environment(app)


js_libs = Bundle('lib/jquery.js',
                 'lib/mimeparse.js',
                 'lib/underscore.js',
                 'lib/mousetrap.js',
                 'lib/modernizr.custom.js',
                 'lib/exif.js',
                 filters='rjsmin',
                 output='gen/packed_libs.js')
assets.register('js_libs', js_libs)



js_angular = Bundle('lib/angular.js',
                    'lib/angular-sanitize.js',
                    filters='rjsmin',
                    output='gen/packed_angular.js')
assets.register('js_angular', js_angular)

js_jskom = Bundle('app/jskom.js',
                  'app/jskom.HttpkomConnection.js',
                  'app/jskom.MembershipList.js',
                  'app/jskom.MembershipListHandler.js',
                  'app/jskom.Reader.js',
                  'app/jskom.controllers.js',
                  'app/jskom.connections.js',
                  'app/jskom.directives.js',
                  'app/jskom.filters.js',
                  'app/jskom.keybindings.js',
                  'app/jskom.services.js',
                  'app/jskom.templates.js',
                  filters='rjsmin',
                  output='gen/packed_jskom.js')
assets.register('js_jskom', js_jskom)

css_jskom = Bundle('stylesheets/app.css',
                   'stylesheets/font-awesome.css',
                   'style.css',
                   filters='cssmin',
                   output='gen/packed_jskom.css')
assets.register('css_jskom', css_jskom)


@app.route("/", defaults={ 'path': '' })
@app.route("/<path:path>")
def index(path):
    # path is for html5 push state
    return render_template('index.html',
                           version=version.__version__,
                           static_version=app.config['STATIC_VERSION'],
                           httpkom_server=app.config['HTTPKOM_SERVER'],
                           httpkom_connection_header=app.config['HTTPKOM_CONNECTION_HEADER'])

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/x-icon')
