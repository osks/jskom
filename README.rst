jskom
=====

jskom is a web based LysKOM client written in Javascript. It comes
with a Python web app for configuring and serving the Javascript
files.

jskom uses httpkom for communication with the LysKOM server.

The source code can be found at: https://github.com/osks/jskom

Packages are published on PyPI: https://pypi.org/project/jskom/

Docker images are published on Docker Hub: https://hub.docker.com/r/osks/jskom


Dependencies
------------

httpkom: https://github.com/osks/httpkom

For required Python packages, see requirements.txt. Install them with::

    $ pip install -r requirements.txt

For running the tests from the Makefile in a console, you need
PhantomJS. You can still run the tests in a regular browser if you
want. (If you use Homebrew on OS X, you can install it with 'brew
install phantomjs'.)


For information: The jskom tests uses the Mocha framework
(http://visionmedia.github.com/mocha/) and mocha-phantomjs
(http://metaskills.net/mocha-phantomjs/). Both are included with
jskom. For mocha-phantomjs to work, mocha.js had to be patched to use
a real diff library::

    require.register("browser/diff.js", function(module, exports, require){
      module.exports = JsDiff; // this row was added
    });


Running
-------

Default port is 5000.

Development
***********

::

   $ make run-debug-server


Docker
******

Simple example::

   $ docker run -ti --name=jskom --net=host osks/jskom


More complete::

   $ docker run -d --name=jskom --net=host --restart=always \
       -v /path/to/my-httpkom-config.cfg:/httpkom.cfg \
       -v /path/to/my-jskom-config.cfg:/jskom.cfg \
       osks/jskom:v0.21


Development
-----------

Preparing a release
*******************

On master:

1. Update and check CHANGELOG.md.

2. Increment version number and remove ``+dev`` suffix
   IN BOTH ``setup.py`` AND ``jskom/version.py``!

3. Test manually by using jskom.

4. Commit, push.

5. Tag (annotated) with ``v<version>`` (example: ``v0.1``) and push the tag::

       git tag -a v0.1 -m "Version 0.1"
       git push origin v0.1

6. Build PyPI dist: ``make dist``

7. Push to Test PyPI: ``twine upload --repository testpypi dist/*`` and check
   https://test.pypi.org/project/jskom/ .

8. Push to PyPI: ``twine upload dist/*`` and check
   https://pypi.org/project/jskom/ .

9. Add ``+dev`` suffix to version number, commit and push.


Tools
*****

Install and update release tools with::

    pip install --upgrade setuptools wheel pip twine

Twine is used for pushing the built dist to PyPI. The examples in the
release process depends on a ``.pypirc`` file with config for the pypi
and testpypi repositories.

Example of ``.pypirc``::

    [pypi]
    username = __token__
    password = pypi-...

    [testpypi]
    repository = https://test.pypi.org/legacy/
    username = __token__
    password = pypi-...


Authors
-------

Oskar Skoog <oskar@osd.se>


Copyright and license
---------------------

Copyright (c) 2012-2021 Oskar Skoog. jskom is provided under the MIT
license. See the included LICENSE.txt file for specifics.
