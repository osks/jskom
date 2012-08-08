// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.filters', ['jskom.services']);
/*  filter('formatTextBody', [
    '$log', 'htmlFormattingService',
    function($log, htmlFormattingService) {
      return function(rawBody) {
        var escaped = htmlFormattingService.escapeHtml(rawBody);
        escaped = htmlFormattingService.formatLineBreaks(escaped);
        escaped = htmlFormattingService.linkify(escaped);
        return escaped;
      };
    }
  ]);
*/