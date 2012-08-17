// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', ['jskom.templates']).
  filter('jskomTemplate', [
    'templatePath',
    function(templatePath) {
      return function(filename) {
        return templatePath(filename);
      }
    }
  ]);
