PHANTOMJS=phantomjs ./test/lib/mocha-phantomjs.coffee


all: test

run-debug-server:
	JSKOM_SETTINGS=../configs/debug.cfg python3 ./runserver.py

test: test-unit

test-unit:
	@$(PHANTOMJS) ./test/unit/unittests.html

scss:
	(cd foundation && compass compile)

.PHONY: all run-debug-server test test-unit scss
