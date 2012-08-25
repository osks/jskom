// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

(function($) {

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

angular.module('jskom.templates', []).
  provider('templatePath', function() {
    var version = null;
    var urlPrefix = '';
    
    this.setUrlPrefix = function(newUrlPrefix) {
      urlPrefix = newUrlPrefix;
    };
    
    this.setVersion = function(newVersion) {
      version = newVersion;
    };
    
    var path = function(file) {
      var url = urlPrefix + file;
      if (version) {
        return url + '?v=' + version;
      } else {
        return url;
      }
    };
    this.path = path;
    
    this.$get = function() {
      return function(file) {
        return path(file);
      }
    };
  });

angular.module('jskom', ['jskom.settings', 'jskom.templates', 'jskom.services',
                         'jskom.controllers', 'jskom.filters', 'jskom.directives',
                         'jskom.auth']).
  config([
    '$routeProvider', 'templatePathProvider',
    function($routeProvider, templatePathProvider) {
      $routeProvider.
        when('/', {
          templateUrl: templatePathProvider.path('unreadconfs.html'),
          controller: 'UnreadConfsCtrl'
        }).
        when('/conferences/go-to', {
          templateUrl: templatePathProvider.path('gotoconf.html'),
          controller: 'GoToConfCtrl'
        }).
        when('/conferences/set-unread', {
          templateUrl: templatePathProvider.path('set_unread.html'),
          controller: 'SetUnreadTextsCtrl'
        }).
        when('/conferences/:confNo/set-unread', {
          templateUrl: templatePathProvider.path('set_unread.html'),
          controller: 'SetUnreadTextsCtrl'
        }).
        when('/conferences/:confNo/unread/', {
          templateUrl: templatePathProvider.path('reader.html'),
          controller: 'ReaderCtrl',
          reloadOnSearch: false
        }).
        when('/conferences/:confNo', {
          templateUrl: templatePathProvider.path('showconf.html'),
          controller: 'ShowConfCtrl'
        }).
        when('/texts/new', {
          templateUrl: templatePathProvider.path('newtext.html'),
          controller: 'NewTextCtrl'
        }).
        when('/texts/:textNo', {
          templateUrl: templatePathProvider.path('showtext.html'),
          controller: 'ShowTextCtrl'
        }).
        otherwise({
          redirectTo: '/'
        });
    }
  ]).
  config(['$locationProvider', function($locationProvider) {  
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
  }]);
