# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog.

import os
import logging
from logging.handlers import TimedRotatingFileHandler

from quart import Quart, render_template, send_from_directory
from webassets import Environment, Bundle

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


app = Quart(__name__)

assets = Environment(
    directory=app.static_folder,
    url='/static')

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


def build_assets(assets_env, bundle_names):
    assets_urls = {}
    for name in bundle_names:
        assets_urls[name] = assets_env[name].urls()
    return assets_urls


def init_app(app):
    # Use Flask's Config class to read config, as Quart's config
    # handling is not identical to Flask's and it didn't work with our
    # config files.  Flask will parse the config file as it was a
    # Python file, so you can use lists for example. In Quart the list
    # became a string.
    #
    # Hack: Parse with Flask and then convert (via a dict) to Quart.

    import flask
    config = flask.Config(app.config.root_path)

    config.from_object(default_settings)
    if 'JSKOM_SETTINGS' in os.environ:
        app.logger.info("Using config file specified by JSKOM_SETTINGS environment variable: %s",
                        os.environ['JSKOM_SETTINGS'])
        config.from_envvar('JSKOM_SETTINGS')
    else:
        app.logger.info("No environment variable JSKOM_SETTINGS found, using default settings.")

    # Import config to Quart's app object.
    config_dict = dict(config)
    app.config.from_mapping(config_dict)

    # Initialize assets
    # Flask Assets and webassets jinja integration does not work with Quart.
    assets.debug = app.debug
    app.config['ASSETS_URLS'] = build_assets(assets, ['js_libs', 'js_angular', 'js_jskom', 'css_jskom'])

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


@app.route("/", defaults={ 'path': '' })
@app.route("/<path:path>")
async def index(path):
    # path is for html5 push state
    return await render_template('index.html',
                                 assets_urls=app.config['ASSETS_URLS'],
                                 version=version.__version__,
                                 static_version=app.config['STATIC_VERSION'],
                                 httpkom_server=app.config['HTTPKOM_SERVER'],
                                 httpkom_connection_header=app.config['HTTPKOM_CONNECTION_HEADER'])

@app.route('/favicon.ico')
async def favicon():
    return await send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/x-icon')
