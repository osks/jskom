// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.auth', ['jskom.settings', 'jskom.services']).
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
  factory('authService', [
    '$http', '$log', 'httpkomServer', 'jskomName', 'jskomVersion',
    function($http, $log, httpkomServer, jskomName, jskomVersion) {
      var config = { withCredentials: true };
      return {
        newSession: function() {
          return { pers_name: '', client: { name: jskomName, version: jskomVersion } };
        },
        
        createSession: function(session) {
          return $http.post(httpkomServer + '/sessions/', session, config);
        },
        
        destroySession: function(sessionId) {
          return $http.delete(httpkomServer + '/sessions/' + sessionId, config);
        },
        
        getSession: function(sessionId) {
          return $http.get(httpkomServer + '/sessions/' + sessionId, config);
        },
        
        getCurrentSessionId: function() {
          return $.cookie('session_id');
        },
        
        getCurrentSession: function() {
          var sessionId = this.getCurrentSessionId();
          return this.getSession(sessionId);
        }
      };
  }]).
  controller('SessionCtrl', [
    '$rootScope', '$scope', 'authService', 'messagesService', 'pageTitleService',
    function($rootScope, $scope, authService, messagesService, pageTitleService) {
      $scope.state = 'loading';
      $scope.session = authService.newSession();
      
      $rootScope.$on('event:loginRequired', function() {
        jskom.Log.debug("SessionCtrl - event:loginRequired");
        $scope.state = 'notLoggedIn';
      });
      
      authService.getCurrentSession().
        success(function(data) {
          jskom.Log.debug("SessionCtrl - getCurrentSession() - success");
          $scope.state = 'loggedIn';
          $scope.session = data;
        }).
        error(function(data, status) {
          jskom.Log.debug("SessionCtrl - getCurrentSession() - error");
          $scope.state = 'notLoggedIn';
          pageTitleService.set("Login");
        });
      
      
      $scope.login = function() {
        jskom.Log.debug("SessionCtrl - login()");
        
        authService.createSession($scope.session).
          success(function(data) {
            jskom.Log.debug("SessionCtrl - login() - success");
            $scope.state = 'loggedIn';
            $scope.session = data;
            messagesService.clearAll();
            pageTitleService.set("");
          }).
          error(function() {
            jskom.Log.debug("SessionCtrl - login() - error");
            $scope.state = 'notLoggedIn';
            messagesService.showMessage('error', 'Failed to login.');
          });
      };
      
      
      $scope.logout = function() {
        jskom.Log.debug("SessionCtrl - logout()");
        
        authService.destroySession(authService.getCurrentSessionId()).
          success(function() {
            $scope.state = 'notLoggedIn';
          }).
          error(function(data, status) {
            if (status == 404) {
              // Session does not exist: we're not logged in.
              $scope.state = 'notLoggedIn';
            } else {
              messagesService.showMessage('error', 'Error when logging out.');
            }
          });
      };
    }
  ]);
