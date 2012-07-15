// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.controllers', ['jskom.services', 'ngResource']).
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
  controller('UnreadConfsCtrl', [
    '$scope', '$http', '$location', '$log',
    'conferencesService', 'pageTitleService', 'messagesService', 'keybindingService',
    function($scope, $http, $location, $log,
             conferencesService, pageTitleService, messagesService, keybindingService) {
      pageTitleService.set("Unread conferences");
      
      $scope.unreadConfs = [];
      $scope.isLoading = true;
      conferencesService.getUnreadConferences().
        success(function(data) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - success");
          $scope.isLoading = false;
          $scope.unreadConfs = data.confs;
        }).
        error(function(data, status) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - error");
          $scope.isLoading = false;
          messagesService.showMessage('error', 'Failed to get unread conferences.', data);
        });

      keybindingService.bind('space', function(e) {
        if (_.size($scope.unreadConfs) > 0) {
          $scope.$apply(function() {
            $location.path("/conferences/" + _.first($scope.unreadConfs).conf_no + "/unread/");
          });
        }
      });
    }
  ]).
  controller('NewTextCtrl', [
    '$scope', 'textsService', '$log', '$location', 'messagesService', 'pageTitleService',
    function($scope, textsService, $log, $location, messagesService, pageTitleService) {
      pageTitleService.set("New text");
      
      $scope.newText = {
        recipient_list: [{ type: 'to', conf_name: '' }],
        content_type: 'text/x-kom-basic',
        subject: '',
        body: ''
      };
      
      $scope.createText = function() {
        textsService.createText($scope.newText).
          success(function(data) {
            $log.log("CreateTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + data.text_no + ' was created.');
            $location.path('/texts/' + data.text_no);
          }).
          error(function(data, status) {
            $log.log("CreateTextCtrl - createText() - error");
            messagesService.showMessage('error', 'Failed to create text.', data);
          });
      };
    }
  ]).
  controller('ShowTextCtrl', [
    '$scope', '$routeParams', 'textsService', '$log', '$location',
    'messagesService', 'pageTitleService', 'keybindingService',
    function($scope, $routeParams, textsService, $log, $location,
             messagesService, pageTitleService, keybindingService) {
      $scope.textNo = $routeParams.textNo;
      $scope.isLoading = true;
      $scope.isCommentFormVisisble = false;
      
      $scope.$watch('text', function(newText) {
        if (newText) {
          pageTitleService.set("Text " + newText.text_no);
        } else {
          pageTitleService.set("");
        }
      });
      
      textsService.getText($scope.textNo).
        success(function(data) {
          $log.log("ShowTextCtrl - getText(" + $scope.textNo + ") - success");
          $scope.isLoading = false;
          $scope.text = data;
        }).
        error(function(data, status) {
          $log.log("ShowTextCtrl - getText(" + $scope.textNo + ") - error");
          $scope.isLoading = false;
          $log.log(data);
          if (status == 404) {
            messagesService.showMessage('error', 'No such text',
                                        'No text with number: ' + data.error_status);
          } else {
            messagesService.showMessage('error', 'Failed to get text.', data);
          }
        });
      
      keybindingService.bind('k', function(e) {
        $scope.$apply(function() {
          $scope.isCommentFormVisible = true;
        });
      });
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$routeParams', '$log', '$window', '$location',
    'readQueueService', 'messagesService', 'conferencesService', 'textsService',
    'pageTitleService', 'keybindingService',
    function($scope, $routeParams, $log, $window, $location,
             readQueueService, messagesService, conferencesService, textsService,
             pageTitleService, keybindingService) {
      $scope.textIsLoading = false;
      $scope.isCommentFormVisible = false;
      
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
      
      var showText = function(textNo, isUnreadOnLoad) {
        if (textNo) {
          $scope.textIsLoading = true;
          textsService.getText(textNo).
            success(function(data) {
              $log.log("ReaderCtrl - getText(" + textNo + ") - success");
              $scope.textIsLoading = false;
              $scope.text = data;
              if (isUnreadOnLoad) {
                $scope.text.is_unread = true;
              }
              angular.element($window).scrollTop(0);
            }).
            error(function(data, status) {
              $log.log("ReaderCtrl - getText(" + textNo + ") - error");
              $scope.textIsLoading = false;
              $scope.text = null;
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
        // When clicking on text links in the reader, we just show the
        // text inside the reader, instead of going to the "show text"
        // page.
        $log.log("ReaderCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        showText(textNo, false);
      });
      
      $scope.$watch('readQueue.current()', function(newText, oldText) {
        showText(newText, true);
      });
      
      keybindingService.bind('space', function(e) {
        $scope.$apply(function() {
          //$log.log("ReaderCtrl - bind(space)");
          if (!readQueue.isEmpty()) {
            if (isScrolledIntoView(angular.element('#read-next'))
                && !$scope.isCommentFormVisible) {
              //angular.element('#read-next').click();
              readQueue.moveNext();
              return false;
            } else {
              return true;
            }
          } else {
            $location.path('/');
            return false;
          }
        });
      });
      
      keybindingService.bind('k', function(e) {
        $scope.$apply(function() {
          $scope.isCommentFormVisible = true;
        });
      });
      
      var isScrolledIntoView = function(elem) {
        if (elem) {
          var docViewTop = angular.element($window).scrollTop();
          var docViewBottom = docViewTop + angular.element($window).height();
          
          var elemTop = angular.element(elem).offset().top;
          var elemBottom = elemTop + angular.element(elem).height();
          
          return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
        } else {
          return false;
        }
      };
    }
  ]);
