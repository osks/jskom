// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.filters', ['jskom.templates']).
  filter('textDate', [
    function() {
      
      function parseMxDate(mxDate) {
        // We have all other dates in unix timestamp format and we
        // get the mx-date aux item in this format: "2013-06-01
        // 04:20:00 +0200"
        var utcMs = Date.UTC(
          parseInt(mxDate.data.substr(0, 4), 10),
          parseInt(mxDate.data.substr(5, 2), 10)-1,
          parseInt(mxDate.data.substr(8, 2), 10),
          parseInt(mxDate.data.substr(11, 2), 10),
          parseInt(mxDate.data.substr(14, 2), 10),
          parseInt(mxDate.data.substr(17, 2), 10));
          
          var tzOffset = (parseInt(mxDate.data.substr(20, 3), 10)*3600) +
            (parseInt(mxDate.data.substr(23, 2), 10)*60);
          
          return (utcMs / 1000) - tzOffset;
      }
      
      return function(text) {
        if (text) {
          var mxDate = _.find(text.aux_items, function(aux_item) {
            return aux_item.tag == 'mx-date';
          });
          
          if (mxDate) {
            return parseMxDate(mxDate);
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
          var mxAuthor = _.find(text.aux_items, function(aux_item) {
            return aux_item.tag == 'mx-author';
          });
          
          if (mxAuthor) {
            return mxAuthor.data;
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
          var mxAuthor = _.find(text.aux_items, function(aux_item) {
            return aux_item.tag == 'mx-author';
          });
          var mxDate = _.find(text.aux_items, function(aux_item) {
            return aux_item.tag == 'mx-date';
          });
          if (mxAuthor && mxDate) {
            return "Imported " + $filter('dateString')(text.creation_time) +
              " by " + $filter('personName')(text.author);
          } else if (mxAuthor) {
            return "Imported by " + $filter('personName')(text.author);
          } else if (mxDate) {
            return "Created at " + $filter('dateString')(text.creation_time);
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
