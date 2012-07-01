// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.auth', []).
  config(['$httpProvider', function($httpProvider) {
    // Inspired by http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
    
    /**
     * $http interceptor.
     * On 401 response - it broadcasts 'event:loginRequired'.
     */
    var interceptor = ['$rootScope','$q', function(scope, $q) {
      
      function success(response) {
        return response;
      }
      
      function error(response) {
        var status = response.status;
        
        if (status == 401) {
          scope.$broadcast('event:loginRequired');
        }
        return $q.reject(response);
      }
      
      return function(promise) {
        return promise.then(success, error);
      }
      
    }];
    
    $httpProvider.responseInterceptors.push(interceptor);
  }]);
