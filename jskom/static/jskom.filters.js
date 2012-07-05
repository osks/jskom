// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', ['ngSanitize']).
  filter('textMediaType', [
    function() {
      return function(contentType) {
        var mime_type = Mimeparse.parseMimeType(contentType);
        return mime_type[0];
      };
    }
  ]).
  filter('textMediaSubType', [
    function() {
      return function(contentType) {
        var mime_type = Mimeparse.parseMimeType(contentType);
        return mime_type[1];
      };
    }
  ]).
  filter('formatTextBody', [
    function() {
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
        safeBody = safeBody.replace(/\r?\n|\r/g, "<br/>");
        return safeBody;
      };
    }
  ]);
