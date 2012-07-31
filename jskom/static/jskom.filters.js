// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', []).
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

        //safeBody = safeBody.replace(/\b([0-9]{4,})\b/g,
        //                            '<em>hej</em><jskom:a text-no="$1">$1</jskom:a>');
        
        return safeBody;
      };
    }
  ]);
