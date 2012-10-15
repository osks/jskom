# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog. Released under GPL.

import os

from flask import Flask, render_template
from flask.ext.assets import Environment, Bundle

import version


class default_settings:
    DEBUG = False
    SEND_FILE_MAX_AGE_DEFAULT = 0
    
    STATIC_VERSION = ''
    
    # httpkom server, without trailing slash (example: 'http://localhost:5001')
    HTTPKOM_SERVER = 'http://localhost:5001'
    HTTKOM_CONNECTION_HEADER = 'Httpkom-Connection'


app = Flask(__name__)
app.config.from_object(default_settings)
if 'JSKOM_SETTINGS' in os.environ:
    app.config.from_envvar('JSKOM_SETTINGS')
else:
    app.logger.info("No environment variable JSKOM_SETTINGS found, using default settings.")

assets = Environment(app)


js_libs = Bundle('lib/jquery.js',
                 'lib/json2.js',
                 'lib/mimeparse.js',
                 'lib/underscore.js',
                 'lib/mousetrap.js',
                 'lib/modernizr.custom.js',
                 filters='rjsmin',
                 output='gen/packed_libs.js')
assets.register('js_libs', js_libs)

js_angular = Bundle('lib/angular.js',
                    'lib/angular-sanitize.js',
                    filters='rjsmin',
                    output='gen/packed_angular.js')
assets.register('js_angular', js_angular)

js_bootstrap = Bundle('bootstrap/js/bootstrap.js',
                     filters='rjsmin',
                     output='gen/packed_bootstrap.js')
assets.register('js_bootstrap', js_bootstrap)

js_jskom = Bundle('jskom.js',
                  'jskom.services.js',
                  'jskom.controllers.js',
                  'jskom.connections.js',
                  'jskom.filters.js',
                  'jskom.directives.js',
                  filters='rjsmin',
                  output='gen/packed_jskom.js')
assets.register('js_jskom', js_jskom)

css_bootstrap = Bundle('bootstrap/css/bootstrap.css',
                       filters='cssmin',
                       output='gen/packed_bootstrap.css')
assets.register('css_bootstrap', css_bootstrap)

css_bootstrap_responsive = Bundle('bootstrap/css/bootstrap-responsive.css',
                                  filters='cssmin',
                                  output='gen/packed_bootstrap_responsive.css')
assets.register('css_bootstrap_responsive', css_bootstrap_responsive)

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
                           static_version=app.config['STATIC_VERSION'],
                           httpkom_server=app.config['HTTPKOM_SERVER'],
                           httpkom_connection_header=app.config['HTTKOM_CONNECTION_HEADER'])
