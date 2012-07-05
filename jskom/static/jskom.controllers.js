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
    '$rootScope', '$scope', 'authService', 'messagesService', 'pageTitleService',
    function($rootScope, $scope, authService, messagesService, pageTitleService) {
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
  ]).
  controller('UnreadConfsCtrl', [
    '$scope', '$http', 'conferencesService', 'pageTitleService',
    function($scope, $http, conferencesService, pageTitleService) {
      pageTitleService.set("Unread conferences");
      
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
    '$scope', 'textsService', '$log', '$location', 'messagesService', 'pageTitleService',
    function($scope, textsService, $log, $location, messagesService, pageTitleService) {
      pageTitleService.set("New text");
      
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
    '$scope', '$routeParams', 'textsService', '$log', '$location',
    'messagesService', 'pageTitleService',
    function($scope, $routeParams, textsService, $log, $location,
             messagesService, pageTitleService) {
      $scope.textNo = $routeParams.textNo;
      
      $scope.$watch('text', function(newText) {
        if (newText) {
          pageTitleService.set("Text " + newText.text_no);
        } else {
          pageTitleService.set("");
        }
      });
      
      $scope.isLoading = true;
      
      textsService.getText($scope.textNo).
        success(function(data) {
          $log.log("ShowTextCtrl - getText() - success");
          $scope.isLoading = false;
          $scope.text = data;
        }).
        error(function(data, status) {
          $log.log("ShowTextCtrl - getText() - error");
          $scope.isLoading = false;
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
    'readMarkingsService', 'pageTitleService',
    function($scope, $routeParams, $log,
             readQueueService, messagesService, conferencesService, textsService,
             readMarkingsService, pageTitleService) {
      $scope.textIsLoading = false;
      
      $scope.$watch('conf', function(newConf) {
        if (newConf) {
          pageTitleService.set("Reading " + newConf.name);
        } else {
          pageTitleService.set("");
        }
      });
      
      conferencesService.getConference($routeParams.confNo).
        success(function(data) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = data;
        }).
        error(function(data, status) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', data);
        });
      
      var readQueue = readQueueService.getReadQueueForConference(
        $routeParams.confNo,
        function() {
          $log.log("ReaderCtrl - getReadQueueForConference(" + $routeParams.confNo +
                   ") - success");
          $scope.readQueue = readQueue;
        },
        function(data) {
          $log.log("ReaderCtrl - getReadQueueForConference(" + $routeParams.confNo +
                   ") - error");
          messagesService.showMessage('error', 'Failed to get unread texts.', data);
        });
      
      var showText = function(textNo, markAsReadOnSuccess) {
        if (textNo) {
          $scope.textIsLoading = true;
          textsService.getText(textNo).
            success(function(data) {
              $log.log("ReaderCtrl - getText(" + textNo + ") - success");
              $scope.textIsLoading = false;
              $scope.text = data;
              if (markAsReadOnSuccess) {
                $scope.text.is_read = false;
                $scope.markAsRead($scope.text);
              }
            }).
            error(function(data, status) {
              $log.log("ReaderCtrl - getText(" + textNo + ") - error");
              $scope.textIsLoading = false;
              $log.log(data);
              if (status == 404) {
                messagesService.showMessage('error', 'No such text',
                                            'No text with number: ' + data.error_status);
              } else {
                messagesService.showMessage('error', 'Failed to get text.', data);
              }
            });
        } else {
          $scope.textIsLoading = false;
          $scope.text = null;
        }
      };
      
      $scope.$on('jskom:a:text', function($event, textNo, href) {
        $log.log("ReaderCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        showText(textNo, false);
      });
      
      $scope.$watch('readQueue.current()', function(newText, oldText) {
        //$log.log("ReaderCtrl - $watch(readQueue.current()) - oldText: " + oldText);
        //$log.log("ReaderCtrl - $watch(readQueue.current()) - newText: " + newText);
        showText(newText, true);
      });
      
      $scope.markAsRead = function(text) {
        readMarkingsService.createGlobalReadMarking(text.text_no).
          success(function(data) {
            $log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - success");
            text.is_read = true;
          }).
          error(function(data, status) {
            $log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', data);
          });
      };
      
      $scope.markAsUnread = function(text) {
        readMarkingsService.destroyGlobalReadMarking(text.text_no).
          success(function(data) {
            $log.log("ReaderCtrl - markAsUnread(" + text.text_no + ") - success");
            text.is_read = false;
          }).
          error(function(data, status) {
            $log.log("ReaderCtrl - markAsUnread(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', data);
          });
      };
    }
  ]);
