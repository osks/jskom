// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';


(function($) {

  var ojskom;    
  ojskom = window.ojskom = {
    version: "0.1",
    
    Routers: {},
    Models: {},
    Collections: {},
    Views: {},
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
      HttpkomServer: "",
      PrefetchCount: 2
    },
    
    Log: {
      debug: function() {
        if (window.console && console.log) {
          console.log.apply(console, arguments);
        }
      }
    },
    
  };
})(jQuery);



(function($) {

  var jskom;    
  jskom = window.jskom = {
    version: "0.1",
    
    Routers: {},
    Models: {},
    Collections: {},
    Views: {},
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
      HttpkomServer: "",
      PrefetchCount: 2
    },
    
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

  
  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
    options.url = jskom.Settings.HttpkomServer + options.url;
    
    options.xhrFields = {
      withCredentials: true
    };
  });


})(jQuery);



angular.module('jskom', ['jskom.auth', 'jskom.services', 'jskom.controllers',
                         'jskom.filters', 'jskom.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/static/partials/unreadconfs.html', controller: 'UnreadConfsCtrl'
      }).
      when('/conferences/:confNo/unread/', {
        templateUrl: '/static/partials/reader.html', controller: 'ReaderCtrl'
      }).
      when('/texts/new', {
        templateUrl: '/static/partials/new_text.html', controller: 'NewTextCtrl'
      }).
      when('/texts/:textNo', {
        templateUrl: '/static/partials/text.html', controller: 'ShowTextCtrl'
      }).
      otherwise({ redirectTo: '/' });
  }]).
  config(['$locationProvider', function($locationProvider) {  
    $locationProvider.hashPrefix('');
    $locationProvider.html5Mode(true);
  }]);
