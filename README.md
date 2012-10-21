jskom
=====

jskom is a web based LysKOM client written in Javascript. It comes
with a Python web app for configuring and serving the Javascript
files.

jskom uses httpkom for communication with the LysKOM server.

jskom source code is available at: https://github.com/osks/jskom


Dependencies
------------

httpkom: https://github.com/osks/httpkom

For required Python packages, see requirements.txt. Install them with:

    $ pip install -r requirements.txt

For running the tests from the Makefile in a console, you need
PhantomJS. You can still run the tests in a regular browser if you
want. (If you use Homebrew on OS X, you can install it with 'brew
install phantomjs'.)


For information: The jskom tests uses the Mocha framework
(http://visionmedia.github.com/mocha/) and mocha-phantomjs
(http://metaskills.net/mocha-phantomjs/). Both are included with
jskom. For mocha-phantomjs to work, mocha.js had to be patched to use
a real diff library:

    require.register("browser/diff.js", function(module, exports, require){
      module.exports = JsDiff; // this row was added
    });


Authors
-------

Oskar Skoog <oskar@osd.se>


Copyright and license
---------------------

Copyright (c) 2012 Oskar Skoog. jskom is provided under the MIT
license. See the included LICENSE.txt file for specifics.
