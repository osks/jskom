PHANTOMJS=phantomjs ./test/lib/mocha-phantomjs.coffee


all: test

run-debug-server:
	JSKOM_SETTINGS=../configs/debug.cfg ./runserver.py

test: test-unit

test-unit:
	@$(PHANTOMJS) ./test/unit/unittests.html


.PHONY: all run-debug-server test test-unit
