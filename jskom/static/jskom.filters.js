// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.filters', ['jskom.templates']).
  filter('confName', [
    function() {
      return function(conf) {
        if (conf) {
          return conf.conf_name;
        } else {
          return "";
        }
      }
    }
  ]).
  filter('confType', [
    function() {
      return function(conf) {
        if (conf) {
          if (conf.type.letterbox === 0) {
            return "Conference";
          } else if (conf.type.letterbox === 1) {
            return "Person";
          } else {
            return "Unknown";
          }
        } else {
          return "";
        }
      }
    }
  ]).
  filter('personName', [
    function() {
      return function(person) {
        if (person) {
          if (person.pers_no == 0) {
            return "Anonymous person";
          } else {
            return person.pers_name;
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
  ])
  .filter('startFrom', function() {
    return function(arr, start) {
      if (arr) {
        return arr.slice(parseInt(start));
      } else {
        return [];
      }
    }
  });
