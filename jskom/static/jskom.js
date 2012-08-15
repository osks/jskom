// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

(function($) {

  var jskom;    
  jskom = window.jskom = {
    Log: {
      debug: function() {
        if (window.console && console.log) {
          console.log.apply(console, arguments);
        }
      }
    },
    
  };
  
  var checkBrowser = function() {
    var supported = true;
    var ul = $("<ul></ul>");
    if (!$.support.ajax) {
      supported = false;
      $(ul).append("<li>Ajax</li>");
    }
    if (!$.support.cors) {
      supported = false;
      $(ul).append("<li>CORS</li>");
    }
    
    if (!supported) {
      $('body').empty().append("<div></div>");
      $('body div')
        .append('<h3>Your browser is too old for jskom</h3>')
        .append('Missing support for:')
        .append(ul);
      return false;
    } else {
      return true;
    }
  };

  $(function() {
    checkBrowser();
  });
})(jQuery);


angular.module('jskom', ['jskom.settings', 'jskom.services', 'jskom.controllers',
                         'jskom.filters', 'jskom.directives', 'jskom.auth']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/static/partials/unreadconfs.html',
        controller: 'UnreadConfsCtrl'
      }).
      when('/conferences/set-unread', {
        templateUrl: '/static/partials/set_unread.html',
        controller: 'SetUnreadTextsCtrl'
      }).
      when('/conferences/:confNo/set-unread', {
        templateUrl: '/static/partials/set_unread.html',
        controller: 'SetUnreadTextsCtrl'
      }).
      when('/conferences/:confNo/unread/', {
        templateUrl: '/static/partials/reader.html',
        controller: 'ReaderCtrl'
      }).
      when('/texts/new', {
        templateUrl: '/static/partials/new_text.html',
        controller: 'NewTextCtrl'
      }).
      when('/texts/:textNo', {
        templateUrl: '/static/partials/showtext.html',
        controller: 'ShowTextCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]).
  config(['$locationProvider', function($locationProvider) {  
    $locationProvider.hashPrefix('');
    $locationProvider.html5Mode(true);
  }]);
