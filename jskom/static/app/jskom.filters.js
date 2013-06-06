// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.filters', ['jskom.templates']).
  //{{ text.author|personName }}

  filter('textDate', [
    function() {
      return function(text) {
        if (text) {
          if (text.jskomMxDate) {
            return text.jskomMxDate;
          } else {
            return text.creation_time;
          };
        } else {
          return text;
        }
      };
    }
  ]).
  filter('textAuthor', [
    '$filter',
    function($filter) {
      return function(text) {
        if (text) {
          if (text.jskomMxAuthor) {
            return text.jskomMxAuthor;
          } else {
            return $filter('personName')(text.author);
          };
        } else {
          return text;
        }
      };
    }
  ]).
  filter('textExtraInfo', [
    '$filter',
    function($filter) {
      return function(text) {
        if (text) {
          if (text.jskomMxAuthor && text.jskomMxDate) {
            return "Imported " + $filter('dateString')(text.creation_time) +
              " by " + $filter('personName')(text.author);
          } else if (text.jskomMxAuthor) {
            return "Imported by " + $filter('personName')(text.author);
          } else if (text.jskomMxDate) {
            return "Created at " + $filter('dateString')(text.jskomMxDate);
          } else {
            return "";
          }
        } else {
          return text;
        }
      };
    }
  ]).
  filter('dateString', [
    '$filter',
    function($filter) {
      return function(unixTimestamp) {
        return $filter('date')(new Date(unixTimestamp*1000), 'yyyy-MM-dd HH:mm:ss');
      };
    }
  ]).
  filter('confName', [
    function() {
      return function(conf) {
        if (conf) {
          return conf.conf_name;
        } else {
          return "";
        }
      };
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
      };
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
  ]).
  filter('startFrom', [
    function() {
      return function(arr, start) {
        if (arr) {
          return arr.slice(parseInt(start));
        } else {
          return [];
        }
      };
    }
  ]).
  filter('alertBoxClass', [
    function() {
      return function(level) {
        if (level === 'error') {
          return 'alert';
        } else if (level === 'success') {
          return 'success';
        } else {
          return '';
        }
      };
    }
  ]).
  filter('capitalize', [
    function() {
      return function(str) {
        if (_.isString(str)) {
          return str.charAt(0).toUpperCase() + str.slice(1);
        } else {
          return str;
        }
      };
    }
  ]).
  filter('isUnread', [
    '$log',
    function ($log) {
      return function (textNo, membership) {
        if (membership != null && membership.unread_texts != null) {
          if (membership.unread_texts.indexOf(parseInt(textNo, 10)) !== -1) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      };
    }
  ]);
