#!/usr/bin/env python
# -*- coding: utf-8 -*-

from jskom import app


if __name__ == "__main__":
    # use 127.0.0.1 instead of localhost to avoid delays related to ipv6.
    # http://werkzeug.pocoo.org/docs/serving/#troubleshooting
    app.run(host='127.0.0.1', port=5000, debug=True)
