// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.auth', ['jskom.settings', 'jskom.services']).
  config([
    '$httpProvider',
    function($httpProvider) {
      // Inspired by http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
      
      /**
       * $http interceptor.
       * On 401 response - it broadcasts 'event:loginRequired'.
       */
      var interceptor = [
        '$rootScope','$q', '$log',
        function($rootScope, $q, $log) {
          function success(response) {
            return response;
          }
          
          function error(response) {
            var status = response.status;
            
            if (status == 401) {
              $rootScope.$broadcast('event:loginRequired');
            } else if (status == 428) {
              // TODO: It would be great if we could retry the failed
              // request here! Or just have httpkom create a session on
              // the fly.
              
              // The response has the config object, which is what we
              // need to do the same request again, but requiring
              // $http here makes it a circular dependency when
              // AngularJS is constructing $http.
              
              // Check here (the linked github) for suggestion on how
              // to solve the circular dependency.
              // http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
            }
            return $q.reject(response);
          }
          
          return function(promise) {
            return promise.then(success, error);
          }
        }
      ];
      
      $httpProvider.responseInterceptors.push(interceptor);
    }
  ]).
  factory('sessionsService', [
    '$http', '$log', 'httpkomServer', 'jskomName', 'jskomVersion',
    'textsCache', 'membershipsCache', 'messagesService',
    function($http, $log, httpkomServer, jskomName, jskomVersion,
             textsCache, membershipsCache, messagesService) {
      var clientInfo = { name: jskomName, version: jskomVersion };
      var config = { withCredentials: true };
      var currentSessionNo = null;
      var currentPerson = null;
      
      var clearAllCaches = function() {
        $log.log("sessionsService - clearing all caches");
        textsCache.removeAll();
        membershipsCache.removeAll();
      };
      
      return {
        createSession: function() {
          var data = { client: clientInfo };
          return $http.post(httpkomServer + '/sessions/', data, config).then(
            function(response) {
              clearAllCaches();
              return response;
            });
        },
        
        deleteSession: function() {
          var sessionNo = 0; // 0 means current session
          return $http.delete(httpkomServer + '/sessions/' + sessionNo, config).then(
            function(response) {
              clearAllCaches();
              return response;
            });
        },
        
        // Not implemented in httpkom
        /*getSession: function(sessionId) {
          return $http.get(httpkomServer + '/sessions/' + sessionId, config);
        },*/
        
        getCurrentConnectionId: function() {
          return $.cookie('connection_id');
        },
        
        getCurrentSessionNo: function() {
          return currentSessionNo;
        },
        
        setCurrentSessionNo: function(sessionNo) {
          currentSessionNo = sessionNo;
        },
        
        getCurrentPerson: function() {
          return currentPerson;
        },
        
        setCurrentPerson: function(person) {
          currentPerson = person;
        },
        
        
        // Methods on current session:
        
        newPerson: function(persNo) {
          persNo = persNo || null;
          return { pers_name: '', pers_no: persNo, passwd: '' };
        },
        
        whoAmI: function() {
          return $http.get(httpkomServer + '/sessions/current/who-am-i', config);
        },
        
        login: function(person) {
          var data = { person: person };
          return $http.post(httpkomServer + '/sessions/current/login', data, config).then(
            function(response) {
              clearAllCaches();
              return response;
            });
        },
        
        logout: function() {
          return $http.post(httpkomServer + '/sessions/current/logout', null, config).then(
            function(response) {
              clearAllCaches();
              return response;
            });
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
            );
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
        $scope.person = sessionsService.newPerson();
      };
      
      var connect = function() {
        sessionsService.setCurrentSessionNo(null);
        sessionsService.setCurrentPerson(null);
        $scope.isLoading = true;
        $scope.state = 'notLoggedIn';
        return sessionsService.createSession().then(
          function(response) {
            $log.log("SessionCtrl - createSession() - success");
            $scope.isLoading = false;
          },
          function(response) {
            $log.log("SessionCtrl - createSession() - error");
            messagesService.showMessage('error', 'Failed to connect to the LysKOM server.',
                                        response.data);
            $scope.isLoading = false;
          });
      };
      
      var getCurrentSession = function() {
        var currentConnectionId = sessionsService.getCurrentConnectionId();
        if (currentConnectionId) {
          $scope.isLoading = true;
          $scope.state = '';
          sessionsService.whoAmI().then(
            function(response) {
              $log.log("SessionCtrl - whoAmI() - success");
              sessionsService.setCurrentSessionNo(response.data.session_no);
              if (response.data.person) {
                $scope.$emit('jskom:auth:login:success', response.data.person);
              } else {
                $scope.state = 'notLoggedIn';
              }
              $scope.isLoading = false;
            },
            function(response) {
              $log.log("SessionCtrl - whoAmI() - error");
              $scope.state = 'notLoggedIn';
              $scope.isLoading = false;
              if (response.status == 428) {
                connect();
              }
            });
        } else {
          connect();
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
        sessionsService.logout().then(
          function() {
            $location.url('/');
          },
          function(response) {
            messagesService.showMessage('error', 'Error when logging out.', response.data);
          });
      };
      
      $scope.$on('jskom:auth:login:success', function($event, person) {
        sessionsService.setCurrentPerson(person);
        $scope.state = 'loggedIn';
        $scope.person = person;
        messagesService.clearAll();
      });
      
      $scope.$on('jskom:auth:login:failure', function($event) {
        $scope.state = 'notLoggedIn';
      });
      
      $scope.$on('jskom:auth:person:created', function($event, persNo) {
        $scope.person = sessionsService.newPerson(persNo);
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
        if ($scope.person.passwd != $scope.confirmpasswd) {
          messagesService.showMessage('error', 'The confirmation password is not correct.');
          return;
        }
        
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
        sessionsService.login($scope.person).then(
          function(response) {
            $log.log("LoginCtrl - login() - success");
            $scope.$emit('jskom:auth:login:success', response.data.person);
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
