# -*- coding: utf-8 -*-
# Copyright (C) 2012 Oskar Skoog.

import os
import logging
from logging.handlers import TimedRotatingFileHandler

import flask
from quart import Quart, render_template, send_from_directory, current_app
from webassets import Environment, Bundle

import httpkom

from . import version


class default_settings:
    DEBUG = False
    LOG_FILE = None
    LOG_LEVEL = logging.WARNING

    SEND_FILE_MAX_AGE_DEFAULT = 0

    STATIC_VERSION = ''

    # httpkom server, without trailing slash (example: 'http://127.0.0.1:5001')
    #HTTPKOM_SERVER = 'http://127.0.0.1:5001'
    HTTPKOM_SERVER = '/httpkom'
    HTTPKOM_CONNECTION_HEADER = 'Httpkom-Connection'


log = logging.getLogger("jskom")

jskom_app = Quart(__name__)
httpkom_app = httpkom.app

# Hypercorn includes a dispatcher middleware but it's buggy
# https://gitlab.com/pgjones/hypercorn/issues/106
from hypercorn.utils import invoke_asgi
class DispatcherMiddleware:
    def __init__(self, app, mounts=None):
        self.app = app
        self.mounts = mounts or {}

    async def __call__(self, scope, receive, send):
        if scope["type"] not in {"http", "websocket"}:
            return await invoke_asgi(self.app, scope, receive, send)
        for path, app in self.mounts.items():
            if scope["path"].startswith(path):
                scope["path"] = scope["path"][len(path) :] or '/'
                return await invoke_asgi(app, scope, receive, send)
        return await invoke_asgi(self.app, scope, receive, send)


app = DispatcherMiddleware(
    jskom_app,
    {
        "/httpkom": httpkom_app,
    }
)

assets = Environment(
    directory=jskom_app.static_folder,
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


def init_app():
    httpkom.init_app(httpkom_app)

    # Use Flask's Config class to read config, as Quart's config
    # handling is not identical to Flask's and it didn't work with our
    # config files.  Flask will parse the config file as it was a
    # Python file, so you can use lists for example. In Quart the list
    # became a string.
    #
    # Hack: Parse with Flask and then convert (via a dict) to Quart.
    config = flask.Config(jskom_app.config.root_path)
    config.from_object(default_settings)
    if 'JSKOM_SETTINGS' in os.environ:
        log.info("Using config file specified by JSKOM_SETTINGS environment variable: %s",
                 os.environ['JSKOM_SETTINGS'])
        config.from_envvar('JSKOM_SETTINGS')
    else:
        log.info("No environment variable JSKOM_SETTINGS found, using default settings.")
    # Import config to Quart's app object.
    config_dict = dict(config)
    jskom_app.config.from_mapping(config_dict)

    # Initialize assets
    # Flask Assets and webassets jinja integration does not work with Quart.
    assets.debug = jskom_app.debug
    jskom_app.config['ASSETS_URLS'] = build_assets(assets, ['js_libs', 'js_angular', 'js_jskom', 'css_jskom'])

    if not jskom_app.debug and jskom_app.config['LOG_FILE'] is not None:
        # keep 7 days of logs, rotated every midnight
        file_handler = TimedRotatingFileHandler(
            jskom_app.config['LOG_FILE'], when='midnight', interval=1, backupCount=7)

        file_handler.setFormatter(logging.Formatter(
               '%(asctime)s %(levelname)s: %(message)s '
                '[in %(pathname)s:%(lineno)d]'
                ))

        file_handler.setLevel(jskom_app.config['LOG_LEVEL'])

        jskom_app.logger.addHandler(file_handler)
        jskom_app.logger.setLevel(jskom_app.config['LOG_LEVEL'])
        jskom_app.logger.info("Finished setting up file logger.");


@jskom_app.route("/", defaults={ 'path': '' })
@jskom_app.route("/<path:path>")
async def index(path):
    # path is for html5 push state
    resp = await render_template('index.html',
                                 assets_urls=current_app.config['ASSETS_URLS'],
                                 version=version.__version__,
                                 static_version=current_app.config['STATIC_VERSION'],
                                 httpkom_server=current_app.config['HTTPKOM_SERVER'],
                                 httpkom_connection_header=current_app.config['HTTPKOM_CONNECTION_HEADER'])
    # Avoid browser caching the main page, as that is where we set the
    # static version that should break caches. This should force the
    # browser to always update the page if you reload it.
    headers = {"Cache-Control": "no-store"}
    return resp, 200, headers

@jskom_app.route('/favicon.ico')
async def favicon():
    return await send_from_directory(os.path.join(current_app.root_path, 'static'),
                               'favicon.ico', mimetype='image/x-icon')
