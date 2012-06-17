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
  }]).
  factory('authService', ['$http', function($http) {
    
    this.createSession = function(session) {
      var config = { withCredentials: true };
      return $http.post('http://localhost:5001/sessions/', session, config);
    };
    
    this.destroySession = function(sessionId) {
      var config = { withCredentials: true };
      return $http.delete('http://localhost:5001/sessions/' + sessionId, config);
    };
    
    this.getSession = function(sessionId) {
      var config = { withCredentials: true };
        return $http.get('http://localhost:5001/sessions/' + sessionId, config);
    };
      
    this.getCurrentSessionId = function() {
      return $.cookie('session_id');
    };
    
    this.getCurrentSession = function() {
      var sessionId = this.getCurrentSessionId();
      return this.getSession(sessionId);
    };
    
    return this;
  }]);
