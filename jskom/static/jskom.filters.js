// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', []).
  filter('foo', function() {
    return function(input) {
      var out = "foo " + input;
      return out;
    }
  });
