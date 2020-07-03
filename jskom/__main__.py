#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import asyncio
import logging

from hypercorn.asyncio import serve
from hypercorn.config import Config

from jskom import app, init_app

log = logging.getLogger("jskom.main")


def run(host, port):
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    init_app()
    config = Config()
    config.bind = ["{}:{}".format(host, port)]
    asyncio.run(serve(app, config), debug=True)


def main():
    logging.basicConfig(format='%(asctime)s %(levelname)-7s %(name)-15s %(message)s', level=logging.INFO)

    parser = argparse.ArgumentParser(description='Jskom')
    parser.add_argument(
        '--debug', help='Enable debug logging',
        default=False, action='store_true')

    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    parser.add_argument(
        '--host', help='Hostname or IP to listen on',
        default='127.0.0.1')
    parser.add_argument(
        '--port', help='Port to listen on',
        type=int, default=5000)

    args = parser.parse_args()
    loglevel = logging.DEBUG if args.debug else logging.INFO
    logging.getLogger().setLevel(loglevel)

    if not args.debug:
        # asyncio logs quite verbose also on INFO level, so set to WARNING.
        logging.getLogger('asyncio').setLevel(logging.WARNING)

    log.info("Using args: %s", args)

    run(args.host, args.port)


if __name__ == "__main__":
    main()
