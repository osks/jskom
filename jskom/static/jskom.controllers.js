// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.controllers', ['jskom.services', 'jskom.settings']).
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
  controller('HelpCtrl', [
    '$scope', '$log', 'keybindingService',
    function($scope, $log, keybindingService) {
      $scope.isVisible = false;
      
      keybindingService.bindGlobal('?', 'Show this help (toggle)', function(e) {
        $scope.$apply(function() {
          $scope.isVisible = !$scope.isVisible;
        });
      });
      
      $scope.$watch(keybindingService.getBindings, function(newBindings) {
        $scope.globalKeys = _.reject(newBindings, function(kb) {
          return kb.isLocal;
        });
        $scope.localKeys = _.filter(newBindings, function(kb) {
          return kb.isLocal;
        });
      }, true);
    }
  ]).
  controller('UnreadConfsCtrl', [
    '$scope', '$http', '$location', '$log', '$timeout',
    'conferencesService', 'pageTitleService', 'messagesService', 'keybindingService',
    function($scope, $http, $location, $log, $timeout,
             conferencesService, pageTitleService, messagesService, keybindingService) {
      pageTitleService.set("Unread conferences");
      
      $scope.load = function() {
        $scope.unreadConfs = [];
        $scope.isLoading = true;
        return conferencesService.getUnreadConferences().
          success(function(data) {
            $log.log("UnreadConfsCtrl - getUnreadConferences() - success");
            $scope.isLoading = false;
            $scope.unreadConfs = data.confs;
          }).error(function(data, status) {
            $log.log("UnreadConfsCtrl - getUnreadConferences() - error");
            $scope.isLoading = false;
            messagesService.showMessage('error', 'Failed to get unread conferences.', data);
          });
      };
      $scope.load();
      
      $scope.autoRefreshing = false;
      $scope.autoRefreshPromise = null;
      $scope.enableAutoRefresh = function() {
        $log.log("UnreadConfsCtrl - enabling auto-refresh");
        $scope.autoRefreshing = true;
        var scheduleReload = function() {
          $scope.autoRefreshPromise = $timeout(function() {
            $scope.load().
              success(function() {
                scheduleReload();
              }).error(function() {
                $scope.disableAutoRefresh();
              });
          }, 2*60*1000);
        }
        scheduleReload();
      };
      $scope.disableAutoRefresh = function() {
        if ($scope.autoRefreshPromise != null) {
          $log.log("UnreadConfsCtrl - disabling auto-refresh");
          $scope.autoRefreshing = false;
          $timeout.cancel($scope.autoRefreshPromise);
          $scope.autoRefresher = null;
        }
      };
      $scope.$on('$destroy', function() {
        $scope.disableAutoRefresh();
      });
      $scope.enableAutoRefresh();
      
      
      $scope.gotoFirstConference = function() {
        $location.path("/conferences/" + _.first($scope.unreadConfs).conf_no + "/unread/");
      };
      
      keybindingService.bindLocal(['space'], 'Go to first conference', function(e) {
        if (_.size($scope.unreadConfs) > 0) {
          $scope.$apply(function() {
            $scope.gotoFirstConference();
          });
        }
      });
      
      keybindingService.bindLocal('R', 'Refresh', function(e) {
        $scope.$apply(function() {
          if (!$scope.isLoading) {
            $scope.load();
          }
        });
      });
      
      keybindingService.bindLocal('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          $location.path('/conferences/set-unread');
        });
      });
    }
  ]).
  controller('SetUnreadTextsCtrl', [
    '$scope', '$http', '$location', '$routeParams', '$log',
    'conferencesService', 'pageTitleService', 'messagesService', 'keybindingService',
    function($scope, $http, $location, $routeParams, $log,
             conferencesService, pageTitleService, messagesService, keybindingService) {
      pageTitleService.set("Set number of unread texts");
      
      $scope.confNo = $routeParams.confNo || null;
      $scope.noOfUnread = 0;
      $scope.isLoading = false;
      
      $scope.setNumberOfUnreadTexts = function() {
        $log.log("SetUnreadTextsCtrl - setNumberOfUnreadTexts()");
        $scope.isLoading = true;
        conferencesService.setNumberOfUnreadTexts($scope.confNo, $scope.noOfUnread).
          success(function(data) {
            $log.log("SetUnreadTextsCtrl - setNumberOfUnreadTexts() - success");
            $scope.isLoading = false;
            messagesService.showMessage('success', 'Successfully set number of unread texts.');
            $location.path('/');
          }).
          error(function(data, status) {
            $log.log("SetUnreadTextsCtrl - setNumberOfUnreadTexts() - error");
            $scope.isLoading = false;
            messagesService.showMessage('error', 'Failed to set number of unread texts.', data);
          });
      };
    }
  ]).
  controller('NewTextCtrl', [
    '$scope', 'textsService', '$log', '$location',
    'messagesService', 'pageTitleService', 'keybindingService',
    function($scope, textsService, $log, $location,
             messagesService, pageTitleService, keybindingService) {
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
    '$scope', '$routeParams', '$log', '$window', 'textsService', 'messagesService',
    function($scope, $routeParams, $log, $window, textsService, messagesService) {
      $scope.textIsLoading = false;
      var showText = function(textNo) {
        $scope.textIsLoading = true;
        textsService.getText(textNo).
          success(function(data) {
            $log.log("ShowTextCtrl - getText(" + textNo + ") - success");
            $scope.textIsLoading = false;
            $scope.text = data;
            angular.element($window).scrollTop(0);
          }).
          error(function(data, status) {
            $log.log("ShowTextCtrl - getText(" + textNo + ") - error");
            $scope.textIsLoading = false;
            $scope.text = null;
            if (status == 404) {
              messagesService.showMessage('error', 'No such text',
                                          'No text with number: ' + data.error_status);
            } else {
              messagesService.showMessage('error', 'Failed to get text.', data);
            }
          });
      };
      
      showText($routeParams.textNo);
    }
  ]).
  controller('TextCtrl', [
    '$scope', '$log', '$window',
    'httpkomServer', 'keybindingService', 'readMarkingsService', 'textsService',
    'messagesService',
    function($scope, $log, $window,
             httpkomServer, keybindingService, readMarkingsService, textsService,
             messagesService) {
      $scope.isCommentFormVisisble = false;
      $scope.readmarkIsLoading = false;
      $scope.textMode = "default";
      
      keybindingService.bindLocal('k', 'Write comment', function(e) {
        $scope.$apply(function() {
          $scope.isCommentFormVisible = true;
        });
        return false;
      });
      
      $scope.markAsRead = function() {
        if ($scope.text) {
          var text = $scope.text;
          $scope.readmarkIsLoading = true;
          readMarkingsService.createGlobalReadMarking(text.text_no).
            success(function(data) {
              $log.log("TextCtrl - markAsRead(" + text.text_no + ") - success");
              $scope.readmarkIsLoading = false;
              text._is_unread = false;
            }).
            error(function(data, status) {
              $log.log("TextCtrl - markAsRead(" + text.text_no + ") - error");
              $scope.readmarkIsLoading = false;
              messagesService.showMessage('error', 'Failed to mark text as read.', data);
            });
        }
      };
      
      $scope.markAsUnread = function() {
        if ($scope.text) {
          var text = $scope.text;
          $scope.readmarkIsLoading = false;
          readMarkingsService.destroyGlobalReadMarking(text.text_no).
            success(function(data) {
              $log.log("TextCtrl - markAsUnread(" + text.text_no + ") - success");
              $scope.readmarkIsLoading = false;
              text._is_unread = true;
            }).
            error(function(data, status) {
              $log.log("TextCtrl - markAsUnread(" + text.text_no + ") - error");
              $scope.readmarkIsLoading = false;
              messagesService.showMessage('error', 'Failed to mark text as read.', data);
            });
        }
      };
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$routeParams', '$log', '$window', '$location',
    'messagesService', 'conferencesService', 'textsService', 'textBufferFactory',
    'pageTitleService', 'keybindingService', 'readMarkingsService', 'unreadQueueFactory',
    function($scope, $routeParams, $log, $window, $location,
             messagesService, conferencesService, textsService, textBufferFactory,
             pageTitleService, keybindingService, readMarkingsService, unreadQueueFactory) {
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
      
      var getText = function(textNo) {
        return textsService.getText(textNo).
          success(function(data) {
            $log.log("ReaderTextCtrl - getText(" + textNo + ") - success");
            $log.log(data);
          }).
          error(function(data, status) {
            $log.log("ReaderTextCtrl - getText(" + textNo + ") - error");
            if (status == 404) {
              messagesService.showMessage('error', 'No such text',
                                          'No text with number: ' + data.error_status);
            } else {
              messagesService.showMessage('error', 'Failed to get text.', data);
            }
          });
      };
      
      var markAsRead = function(text) {
        readMarkingsService.createGlobalReadMarking(text.text_no).
          success(function(data) {
            $log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - success");
            text._is_unread = false;
          }).
          error(function(data, status) {
            $log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', data);
          });
      };
      
      var showText = function(textNo) {
        $scope.textIsLoading = true;
        return getText(textNo).
          success(function(text) {
            $scope.textIsLoading = false;
            $scope.buffer.append(text, true);
          }).
          error(function () {
            $scope.textIsLoading = false;
          });
      };
      
      var unreadQueueWatcher = null
      var getUnreadQueue = function(confNo) {
        if (unreadQueueWatcher) {
          unreadQueueWatcher();
        }
        
        readMarkingsService.getReadMarkingsForUnreadInConference(confNo).
          success(function(data) {
            $log.log("ReaderCtrl - getUnreadQueue(" + confNo + ") - success");
            var unreadQueue = unreadQueueFactory.create(data.rms);
            $scope.unreadQueue = unreadQueue;
            
            unreadQueueWatcher = $scope.$watch(
              'unreadQueue.current()', function(newTextNo, oldTextNo) {
                $log.log("ReaderCtrl - watch(unreadQueue.current()): " + newTextNo);
                if (newTextNo) {
                  showText(newTextNo).success(function(text) {
                    markAsRead(text);
                  });
                }
              });
          }).
          error(function(data, status) {
            $log.log("ReaderCtrl - getUnreadQueue(" + confNo + ") - error");
            messagesService.showMessage('error', 'Failed to get unread texts.', data);
          });
      };
      
      $scope.$on('jskom:a:text', function($event, textNo, href) {
        // When clicking on text links in the reader, we just show the
        // text inside the reader, instead of going to the "show text"
        // page.
        //$log.log("ReaderCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        if (!($scope.text && $scope.text.text_no == textNo)) {
          showText(textNo);
        }
      });
      
      $scope.$watch('buffer.currentText()', function(newCurrentText) {
        $scope.text = newCurrentText;
        angular.element($window).scrollTop(0);
      });
      
      $scope.$watch('conf', function(newConf) {
        if (newConf) {
          pageTitleService.set("Reading " + newConf.name);
        } else {
          pageTitleService.set("");
        }
      });
      
      $scope.buffer = textBufferFactory.create(100);
      $scope.text = null;
      $scope.textIsLoading = false;
      $scope.unreadQueue = null;
      
      conferencesService.getConference($routeParams.confNo).
        success(function(data) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = data;
        }).
        error(function(data, status) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', data);
        });
      
      getUnreadQueue($routeParams.confNo);
      
      $scope.readNext = function() {
        if ($scope.buffer.hasUnseen()) {
          $scope.buffer.nextUnseen();
        } else {
          if ($scope.unreadQueue) {
            if ($scope.unreadQueue.isEmpty()) {
              $location.path('/');
            } else {
              $scope.unreadQueue.moveNext();
            }
          }
        }
      };
      
      keybindingService.bindLocal('p', 'Show previous text', function() {
        $scope.$apply(function() {
          $scope.buffer.previous();
        });
        return false;
      });
      
      keybindingService.bindLocal('n', 'Show next text', function() {
        $scope.$apply(function() {
          $scope.buffer.next();
        });
        return false;
      });
      
      $scope.showCommented = function() {
        $log.log('ReaderCtrl - showCommented()');
        if ($scope.text && !_.isEmpty($scope.text.comment_to_list)) {
          showText(_.first($scope.text.comment_to_list).text_no);
          
          _.each(_.rest($scope.text.comment_to_list), function(ct) {
            getText(ct.text_no).success(function(text) {
              $scope.buffer.append(text, false);
            });
          });
        }
      };
      
      $scope.showAllComments = function() {
        $log.log('ReaderCtrl - showAllComments()');
        if ($scope.text && !_.isEmpty($scope.text.comment_in_list)) {
          showText(_.first($scope.text.comment_in_list).text_no);
          
          _.each(_.rest($scope.text.comment_in_list), function(ci) {
            getText(ci.text_no).success(function(text) {
              $scope.buffer.append(text, false);
            });
          });
        }
      };
      
      keybindingService.bindLocal(',', 'Show commented', function() {
        $scope.$apply(function() {
          $scope.showCommented();
        }, 'keydown');
        return false;
      });
      
      // 'å a k' works really bad sometimes, probably because of
      // requiring keypress events (doesn't matter if you specify
      // 'keydown' or not).
      /*keybindingService.bindLocal(['å a k'], 'Show all comments', function() {
        $scope.$apply(function() {
          $scope.showAllComments();
        }, 'keydown');
        return false;
      });*/
      
      keybindingService.bindLocal(['space'], 'Read next unread text', function(e) {
        $scope.$apply(function() {
          if (e.which == 32) {
            // Check that the read next button is visible if we used space
            if (isScrolledIntoView(angular.element('#read-next'))) {
              $scope.readNext();
              return false;
            }
          } else {
            $scope.readNext();
            return false;
          }
        });
      });
      
      keybindingService.bindLocal('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          if ($scope.conf) {
            var confNo = $scope.conf.conf_no;
            $location.path("/conferences/" + confNo + "/set-unread");
          }
        });
      });
    }
  ]);
