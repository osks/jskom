// Copyright (C) 2012 Oskar Skoog.

'use strict';

(function($) {

  var checkBrowser = function() {
    var supported = true;
    var ul = $("<ul></ul>");
    if (!Modernizr.localstorage) {
      supported = false;
      $(ul).append("<li>localStorage</li>");
    }
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
        .append(ul)
        .append('<p>Note: Missing support for localStorage ' +
                'can be because of private mode browsing, ' +
                'which is not supported.</p>');
      return false;
    } else {
      return true;
    }
  };

  $(function() {
    checkBrowser();
  });
})(jQuery);


angular.module('jskom.httpkom', []).
  provider('httpkom', function() {
    var _httpkomServer = null;
    var _cacheVersion = null;

    this.setHttpkomServer = function(httpkomServer) {
      _httpkomServer = httpkomServer;
    };

    /* Set version number to add to URLs to break caches (same as we
     * use for static files such as templates). */
    this.setCacheVersion = function(version) {
      _cacheVersion = version;
    };

    this.$get = [
      '$http',
      function($http) {
        return {
          getHttpkomServer: function() {
            return _httpkomServer;
          },

          getCacheVersion: function() {
            return _cacheVersion;
          },

          getLyskomServers: function() {
            return $http({ method: 'get', url: _httpkomServer + '/' + '?_v=' + _cacheVersion });
          },
        };
      }
    ];
  });


window.jskom = {};

angular.module('jskom', ['jskom.settings', 'jskom.templates', 'jskom.services',
                         'jskom.controllers', 'jskom.filters', 'jskom.directives',
                         'jskom.connections']).
  config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
  }]).
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
        when('/conferences/list', {
          templateUrl: templatePathProvider.path('listconfs.html'),
          controller: 'ListConfsCtrl'
        }).
        when('/conferences/set-unread', {
          templateUrl: templatePathProvider.path('set_unread.html'),
          controller: 'SetUnreadTextsCtrl'
        }).
        when('/conferences/:confNo/set-unread', {
          templateUrl: templatePathProvider.path('set_unread.html'),
          controller: 'SetUnreadTextsCtrl'
        }).
        when('/conferences/:confNo/texts/new', {
          templateUrl: templatePathProvider.path('newtext.html'),
          controller: 'NewTextCtrl'
        }).
        when('/conferences/:confNo/texts/', {
          templateUrl: templatePathProvider.path('unreadtexts.html'),
          controller: 'ReadConferenceTextsCtrl',
          reloadOnSearch: false
        }).
        when('/conferences/:confNo/texts/latest/', {
          templateUrl: templatePathProvider.path('listconftexts.html'),
          controller: 'ListConfTextsCtrl'
        }).
        when('/conferences/:confNo', {
          templateUrl: templatePathProvider.path('showconf.html'),
          controller: 'ShowConfCtrl'
        }).
        when('/texts/new', {
          templateUrl: templatePathProvider.path('newtext.html'),
          controller: 'NewTextCtrl'
        }).
        when('/texts/go-to', {
          templateUrl: templatePathProvider.path('gototext.html'),
          controller: 'GoToTextCtrl'
        }).
        when('/texts/marks/', {
          templateUrl: templatePathProvider.path('listmarks.html'),
          controller: 'ListMarksCtrl'
        }).
        when('/texts/', {
          templateUrl: templatePathProvider.path('showtext.html'),
          controller: 'ReadTextsCtrl',
          reloadOnSearch: false
        }).
        when('/help', {
          templateUrl: templatePathProvider.path('help.html'),
          controller: 'HelpCtrl'
        }).
        otherwise({
          redirectTo: '/'
        });
    }
  ]);
