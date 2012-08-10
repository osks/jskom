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
          return { person: { pers_name: '', pers_no: null }, password: '',
                   client: { name: jskomName, version: jskomVersion } };
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
    '$rootScope', '$scope', '$log',
    'authService', 'messagesService', 'pageTitleService',
    function($rootScope, $scope, $log,
             authService, messagesService, pageTitleService) {
      var reset = function() {
        $scope.session = authService.newSession();
      };
      
      var getCurrentSession = function() {
        $scope.isLoading = true;
        $scope.state = '';
        authService.getCurrentSession().
          success(function(data) {
            $log.log("SessionCtrl - getCurrentSession() - success");
            $scope.isLoading = false;
            $scope.state = 'loggedIn';
            $scope.session = data;
          }).
          error(function(data, status) {
            $log.log("SessionCtrl - getCurrentSession() - error");
            $scope.isLoading = false;
            $scope.state = 'notLoggedIn';
            pageTitleService.set("Login");
          });
      };
      
      var createSession = function() {
        $scope.isLoading = true;
        authService.createSession($scope.session).
          success(function(data) {
            $log.log("SessionCtrl - login() - success");
            $scope.isLoading = false;
            $scope.state = 'loggedIn';
            $scope.session = data;
            messagesService.clearAll();
            pageTitleService.set("");
          }).
          error(function(data) {
            $log.log("SessionCtrl - login() - error");
            $scope.isLoading = false;
            $scope.state = 'notLoggedIn';
            messagesService.showMessage('error', 'Failed to login.', data);
          });
      };
      
      $rootScope.$on('event:loginRequired', function() {
        $log.log("SessionCtrl - event:loginRequired");
        $scope.state = 'notLoggedIn';
      });
      
      $scope.isLoading = false;
      reset();
      getCurrentSession();
      
      $scope.login = function() {
        $log.log("SessionCtrl - login()");
        createSession();
      }
      
      $scope.logout = function() {
        $log.log("SessionCtrl - logout()");
        authService.destroySession(authService.getCurrentSessionId()).
          success(function() {
            $scope.state = 'notLoggedIn';
            reset();
          }).
          error(function(data, status) {
            if (status == 404) {
              // Session does not exist: we're not logged in.
              $scope.state = 'notLoggedIn';
              reset();
            } else {
              messagesService.showMessage('error', 'Error when logging out.');
            }
          });
      };
    }
  ]);
