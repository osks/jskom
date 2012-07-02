// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.controllers', ['jskom.auth', 'ngResource']).
  controller('MessagesCtrl', [
    '$scope', 'messagesService', '$log',
    function($scope, messagesService, $log) {
      $scope.messages = [];
      
      messagesService.onMessage(function(message) {
        $scope.messages.push(message);
      });
      
      messagesService.onClearAll(function() {
        $scope.messages = [];
      });
    }
  ]).
  controller('SessionCtrl', [
    '$rootScope', '$scope', 'authService', 'messagesService',
    function($rootScope, $scope, authService, messagesService) {
      $scope.state = 'loading';
      $scope.session = { client: { name: 'jskom', version: '0.2' } };
      
      
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
        });
      
      
      $scope.login = function() {
        jskom.Log.debug("SessionCtrl - login()");
        
        authService.createSession($scope.session).
          success(function(data) {
            jskom.Log.debug("SessionCtrl - login() - success");
            $scope.state = 'loggedIn';
            $scope.session = data;
            messagesService.clearAll();
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
  ]).
  controller('UnreadConfsCtrl', [
    '$scope', '$http', 'conferencesService',
    function($scope, $http, conferencesService) {
      $scope.unreadConfs = [];
      
      conferencesService.getUnreadConferences().
        success(function(data) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - success");
          $scope.unreadConfs = data.confs;
        }).
        error(function(data, status) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - error");
          // todo: error handling
          jskom.Log.debug(data);
        });
    }
  ]).
  controller('NewTextCtrl', [
    '$scope', 'textsService', '$log', '$location', 'messagesService',
    function($scope, textsService, $log, $location, messagesService) {
      $scope.recipientTypes = [
        { name: 'To', type: 'to' },
        { name: 'CC', type: 'cc' },
        { name: 'BCC', type: 'bcc' }
      ];
      
      $scope.text = {
        recipient_list: [{ type: 'to', conf_name: '' }],
        content_type: 'text/x-kom-basic',
        subject: '',
        body: ''
      };
      
      $scope.newRecipient = function() {
        return { type: 'to', conf_name: '' };
      };
      
      $scope.createText = function() {
        textsService.createText($scope.text).
          success(function(data) {
            $log.log("CreateTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + data.text_no + ' was created.');
            $location.path('/texts/' + data.text_no);
          }).
          error(function(data, status) {
            $log.log("CreateTextCtrl - createText() - error");
            $log.log(data);
            messagesService.showMessage('error', 'Failed to create text.');
          });
      };
    }
  ]).
  controller('ShowTextCtrl', [
    '$scope', '$routeParams', 'textsService', '$log', 'messagesService',
    function($scope, $routeParams, textsService, $log, messagesService) {
      textsService.getText($routeParams.textNo).
        success(function(data) {
          $log.log("ShowTextCtrl - getText() - success");
          $scope.text = data;
        }).
        error(function(data, status) {
          $log.log("ShowTextCtrl - getText() - error");
          $log.log(data);
          if (status == 404) {
            messagesService.showMessage('error', 'No such text',
                                        'No text with number: ' + data.error_status);
          } else {
            messagesService.showMessage('error', 'Failed to get text.', data);
          }
        });
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$routeParams', '$log',
    'readQueueService', 'messagesService', 'conferencesService', 'textsService',
    function($scope, $routeParams, $log,
             readQueueService, messagesService, conferencesService, textsService) {
      
      conferencesService.getConference($routeParams.confNo).
        success(function(data) {
          $log.log("ReaderCtrl - getConference() - success");
          $scope.conf = data;
        }).
        error(function(data, status) {
          $log.log("ReaderCtrl - getConference() - error");
          messagesService.showMessage('error', 'Failed to get conference.', data);
        });
      
      var readQueue = readQueueService.getReadQueueForConference(
        $routeParams.confNo,
        function() {
          $log.log("ReaderCtrl - getReadQueueForConference() - success");
          $scope.readQueue = readQueue;
        },
        function(data) {
          $log.log("ReaderCtrl - getReadQueueForConference() - error");
          messagesService.showMessage('error', 'Failed to get unread texts.', data);
        });
      
      $scope.next = function() {
        $scope.readQueue.moveNext();
      };
      
      $scope.$watch('readQueue.current()', function(newText, oldText) {
        $log.log("ReaderCtrl - $watch(readQueue.current()) - oldText: " + oldText);
        $log.log("ReaderCtrl - $watch(readQueue.current()) - newText: " + newText);
        
        getText(newText);
      });
      
      var getText = function(textNo) {
        if (textNo) {
          textsService.getText(textNo).
            success(function(data) {
              $log.log("ReaderCtrl - getText() - success");
              $scope.text = data;
            }).
            error(function(data, status) {
              $log.log("ReaderCtrl - getText() - error");
              $log.log(data);
              if (status == 404) {
                messagesService.showMessage('error', 'No such text',
                                            'No text with number: ' + data.error_status);
              } else {
                messagesService.showMessage('error', 'Failed to get text.', data);
            }
            });
        } else {
          $scope.text = null;
        }
        
      }
    }
  ]);
