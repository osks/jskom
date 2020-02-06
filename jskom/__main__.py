#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import asyncio
import logging

from hypercorn.asyncio import serve
from hypercorn.config import Config

from jskom import app, init_app


def run(host, port):
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    init_app()
    config = Config()
    config.bind = ["{}:{}".format(host, port)]
    asyncio.run(serve(app, config))


def main():
    logging.basicConfig(format='%(asctime)s %(levelname)s %(message)s', level=logging.DEBUG)
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    host = "127.0.0.1"
    port = 5000
    run(host, port)


if __name__ == "__main__":
    main()
