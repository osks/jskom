// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', ['ngSanitize']).
  filter('foo', function() {
    return function(input) {
      var out = "foo " + input;
      return out;
    }
  }).
  filter('textMediaType', function() {
    return function(contentType) {
      var mime_type = Mimeparse.parseMimeType(contentType);
      return mime_type[0];
    }
  }).
  filter('textMediaSubType', function() {
    return function(contentType) {
      var mime_type = Mimeparse.parseMimeType(contentType);
      return mime_type[1];
    }
  }).
  filter('formatTextBody', [
    '$sanitize',
    function($sanitize) {
      var escape = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
      };
      
      var badChars = /&(?!\w+;)|[<>"'`]/g;
      var possible = /[&<>"'`]/;
      
      var escapeChar = function(chr) {
        return escape[chr] || "&amp;";
      };
      
      // Escape html tags
      var escapeExpression = function(string) {
        if (string == null || string === false) {
          return "";
        }
        if (!possible.test(string)) {
          return string;
        }
        return string.replace(badChars, escapeChar);
      };
      
      return function(rawBody) {
        var safeBody = escapeExpression(rawBody);
        //var safeBody = $sanitize(rawBody);
        safeBody = safeBody.replace(/\r?\n|\r/g, "<br/>");
        return safeBody;
      }
    }
  ]);

/*
    getSafeBody: function() {
      var mime_type = Mimeparse.parseMimeType(this.get('content_type'));
      var type = mime_type[0];
      
      if (type == 'text') {
        var safeBody = Handlebars.Utils.escapeExpression(this.get('body'));
        safeBody = safeBody.replace(/\r?\n|\r/g, "<br>");
        return new Handlebars.SafeString(safeBody);
      } else if (type == 'image') {
        var name = "";
        if (mime_type[2]['name']) {
          name = mime_type[2]['name'];
        }
        
        var imageUrl = Settings.HttpkomServer + this.url() + '/body';
        var imageBody = '<img src="' + imageUrl + '" title="'+ name +'" />';
        return new Handlebars.SafeString(imageBody);
      } else {
        return "<unknown content-type: " + this.get('content_type') + ">";
      }
    },
*/