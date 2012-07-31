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
    'authService', 'personsService', 'messagesService', 'pageTitleService', 'keybindingService',
    function($rootScope, $scope, $log,
             authService, personsService, messagesService, pageTitleService, keybindingService) {
      var reset = function() {
        $scope.session = authService.newSession();
        $scope.lookup = { name: '', matches: [] };
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
      
      $scope.lookupName = function(loginOnMatch) {
        $scope.isLoading = true;
        personsService.lookupPersons($scope.lookup.name).
          success(function(data) {
            $log.log("SessionCtrl - lookupPersons(" + $scope.lookup.name + ") - success");
            $scope.isLoading = false;
            $scope.lookup.matches = data.persons;
            
            if ($scope.lookup.matches.length > 0) {
              $scope.session.person = $scope.lookup.matches[0];
              
              if ($scope.lookup.matches.length == 1 && loginOnMatch) {
                createSession();
              }
            } else {
              messagesService.showMessage('error', 'Could not find any person with that name.');
            }
          }).
          error(function(data) {
            $log.log("SessionCtrl - lookupPersons(" + $scope.lookup.name + ") - error");
            $scope.isLoading = false;
            messagesService.showMessage('error', 'Failed to lookup person.', data);
          });
      };
      
      $rootScope.$on('event:loginRequired', function() {
        $log.log("SessionCtrl - event:loginRequired");
        $scope.state = 'notLoggedIn';
        $scope.session = authService.newSession();
      });
      
      $scope.isLoading = false;
      reset();
      getCurrentSession();
      
      $scope.clearMatchingPersons = function() {
        var oldLookupName = $scope.lookup.name;
        reset();
        $scope.lookup.name = oldLookupName;
      };
      
      $scope.login = function() {
        $log.log("SessionCtrl - login()");
        if ($scope.session.person.pers_no) {
          createSession();
        } else {
          $scope.lookupName(true);
        }
      };
      
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
