#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import asyncio

from hypercorn.asyncio import serve
from hypercorn.config import Config

from jskom import app, init_app


if __name__ == "__main__":
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    init_app(app)
    host = "127.0.0.1"
    port = 5000
    config = Config()
    config.bind = ["{}:{}".format(host, port)]
    asyncio.run(serve(app, config))
