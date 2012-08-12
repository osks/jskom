# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog. Released under GPL.

import os

from flask import Flask, render_template
from flask.ext.assets import Environment, Bundle

import version

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

assets = Environment(app)


js_libs = Bundle('lib/jquery.js',
                 'lib/jquery.cookie.js',
                 'lib/json2.js',
                 'lib/mimeparse.js',
                 'lib/underscore.js',
                 'lib/mousetrap.js',
                 filters='rjsmin',
                 output='gen/packed_libs.js')
assets.register('js_libs', js_libs)

js_angular = Bundle('lib/angular.js',
                    'lib/angular-sanitize.js',
                    #'lib/angular-resource.js',
                    filters='rjsmin',
                    output='gen/packed_angular.js')
assets.register('js_angular', js_angular)

js_jskom = Bundle('jskom.js',
                  'jskom.services.js',
                  'jskom.controllers.js',
                  'jskom.auth.js',
                  'jskom.filters.js',
                  'jskom.directives.js',
                  filters='rjsmin',
                  output='gen/packed_jskom.js')
assets.register('js_jskom', js_jskom)

css_jskom = Bundle('style.css',
                   filters='cssmin',
                   output='gen/packed_jskom.css')
assets.register('css_jskom', css_jskom)


@app.route("/", defaults={ 'path': '' })
@app.route("/<path:path>")
def index(path):
    # path is for html5 push state
    return render_template('index.html',
                           version=version.__version__,
                           httpkom_server=app.config['HTTPKOM_SERVER'])
