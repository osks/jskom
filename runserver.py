#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import logging

import jskom


if __name__ == "__main__":
    logging.basicConfig(format='%(asctime)s %(levelname)s %(message)s', level=logging.DEBUG)
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    host = "127.0.0.1"
    port = 5000
    jskom.run(host, port)
