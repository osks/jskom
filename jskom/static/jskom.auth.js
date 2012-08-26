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
  factory('sessionsService', [
    '$http', '$log', 'httpkomServer', 'jskomName', 'jskomVersion',
    function($http, $log, httpkomServer, jskomName, jskomVersion) {
      var config = { withCredentials: true };
      return {
        newSession: function(persNo) {
          persNo = persNo || null;
          return { person: { pers_name: '', pers_no: persNo }, passwd: '',
                   client: { name: jskomName, version: jskomVersion } };
        },
        
        createSession: function(session) {
          return $http.post(httpkomServer + '/sessions/', session, config);
        },
        
        deleteSession: function(sessionId) {
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
        },
        
        
        changeConference: function(confNo) {
          var data = { conf_no: parseInt(confNo) };
          return $http.post(httpkomServer + '/sessions/current/working-conference',
                            data, config).
            then(
              function(response) {
                $log.log("sessionsService - changeConference(" + confNo + ") - success");
                return response;
              },
              function(response) {
                $log.log("sessionsService - changeConference(" + confNo + ") - error");
                return response;
              }
            );;
        }
      };
  }]).
  controller('SessionCtrl', [
    '$rootScope', '$scope', '$log', '$location',
    'sessionsService', 'messagesService',
    function($rootScope, $scope, $log, $location,
             sessionsService, messagesService) {
      $scope.isLoading = false;
      var reset = function() {
        $scope.session = sessionsService.newSession();
      };
      
      var getCurrentSession = function() {
        if (sessionsService.getCurrentSessionId()) {
          $scope.isLoading = true;
          $scope.state = '';
          sessionsService.getCurrentSession().
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
            });
        } else {
          $scope.state = 'notLoggedIn';
        }
      };
      
      $rootScope.$on('event:loginRequired', function() {
        $log.log("SessionCtrl - event:loginRequired");
        $scope.state = 'notLoggedIn';
      });
      
      $scope.logout = function() {
        $log.log("SessionCtrl - logout()");
        $scope.state = 'notLoggedIn';
        reset();
        sessionsService.deleteSession(sessionsService.getCurrentSessionId()).
          success(function() {
            $location.url('/');
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
      
      $scope.$on('jskom:auth:login:success', function($event, session) {
        $scope.state = 'loggedIn';
        $scope.session = session;
        messagesService.clearAll();
      });
      
      $scope.$on('jskom:auth:login:failure', function($event) {
        $scope.state = 'notLoggedIn';
      });
      
      $scope.$on('jskom:auth:person:created', function($event, persNo) {
        $scope.session = sessionsService.newSession(persNo);
      });
      
      reset();
      getCurrentSession();
    }
  ]).
  controller('LoginTabsCtrl', [
    '$scope', '$log', 'pageTitleService',
    function($scope, $log, pageTitleService) {
      $scope.loginActiveTab = 'login';
      
      $scope.selectTab = function(tab) {
        $scope.loginActiveTab = tab;
      };
      
      $scope.isTabActive = function(tab) {
        if ($scope.loginActiveTab == tab) {
          return 'active';
        } else {
          return '';
        }
      };
      
      $scope.$watch('loginActiveTab', function(newTab) {
        if (newTab == 'login') {
          pageTitleService.set("Log in");
        } else if (newTab == 'create') {
          pageTitleService.set("Create person");
        } else {
          pageTitleService.set("");
        }
        
      });
      
      $scope.$on('jskom:auth:person:created', function($event, persNo) {
        $scope.loginActiveTab = 'login';
      });
    }
  ]).
  controller('NewPersonCtrl', [
    '$scope', '$log', '$location', 'personsService', 'messagesService', 'sessionsService',
    function($scope, $log, $location, personsService, messagesService, sessionsService) {
      var values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      var pickRandom = function() {
        return values[Math.floor(Math.random() * values.length)];
      };
      var newQuestion = function() {
        $scope.v1 = pickRandom();
        $scope.v2 = pickRandom();
        $scope.question = 'what is ' + $scope.v1 + ' + ' + $scope.v2 + '?';
        $scope.answer = '';
      };
      var checkAnswer = function() {
        var answer = parseInt(jQuery.trim($scope.answer));
        if (_.isNaN(answer)) {
          return false;
        }
        
        return (($scope.v1 + $scope.v2) == answer);
      };
      
      newQuestion();
      $scope.isCreating = false;
      $scope.person = personsService.newPerson();
      
      $scope.createPerson = function() {
        if (!checkAnswer()) {
          messagesService.showMessage('error', 'The answer to the control question is wrong.');
          newQuestion();
          return;
        }
        
        $scope.isCreating = true;
        return personsService.createPerson($scope.person).then(
          function(response) {
            $log.log("NewPersonCtrl - createPerson() - success");
            $scope.isCreating = false;
            messagesService.showMessage('success', 'Successfully created person.');
            $scope.$emit('jskom:auth:person:created', response.data.pers_no);
            $scope.person = personsService.newPerson();
          },
          function(response) {
            $log.log("NewPersonCtrl - createPerson() - error");
            $scope.isCreating = false;
            messagesService.showMessage('error', 'Failed to create person.', response.data);
            newQuestion();
          }
        );
      };
    }
  ]).
  controller('LoginCtrl', [
    '$scope', '$log', 'sessionsService', 'messagesService',
    function($scope, $log, sessionsService, messagesService) {
      $scope.isLoggingIn = false;
      
      $scope.login = function() {
        $scope.isLoggingIn = true;
        sessionsService.createSession($scope.session).then(
          function(response) {
            $log.log("LoginCtrl - login() - success");
            $scope.$emit('jskom:auth:login:success', response.data);
            $scope.isLoggingIn = false;
          },
          function(response) {
            $log.log("LoginCtrl - login() - error");
            messagesService.showMessage('error', 'Failed to login.', response.data);
            $scope.$emit('jskom:auth:login:failure');
            $scope.isLoggingIn = false;
          });
      };
    }
  ]);
