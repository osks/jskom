// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', ['jskom.templates']).
  filter('jskomTemplate', [
    'templatePath',
    function(templatePath) {
      return function(filename) {
        return templatePath(filename);
      };
    }
  ]).
  filter('personName', [
    function() {
      return function(author) {
        if (author) {
          if (author.pers_no == 0) {
            return "Anonymous person";
          } else {
            return author.pers_name;
          }
        } else {
          return "";
        }
      };
    }
  ]).
  filter('serverName', [
    function() {
      return function(server) {
        return server.name + " (" + server.host + ":" + server.port + ")";
      };
    }
  ]);
