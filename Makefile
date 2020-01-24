PHANTOMJS=phantomjs ./test/lib/mocha-phantomjs.coffee

all: test

clean:
	rm -rf dist

dist:
	rm -rf dist
	python3 setup.py sdist

run-debug-server:
	JSKOM_SETTINGS=../configs/debug.cfg python3 ./runserver.py

test: test-unit

test-unit:
	@$(PHANTOMJS) ./test/unit/unittests.html

scss:
	(cd foundation && compass compile)

.PHONY: all clean dist run-debug-server test test-unit scss
