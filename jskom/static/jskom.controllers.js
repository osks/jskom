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
        var p = conferencesService.getUnreadConferences();
        p.success(function(data) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - success");
          $scope.isLoading = false;
          $scope.unreadConfs = data.confs;
          return p;
        }).error(function(data, status) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - error");
          $scope.isLoading = false;
          messagesService.showMessage('error', 'Failed to get unread conferences.', data);
          return p;
        });
        return p;
      };
      $scope.load();
      
      $scope.autoRefreshing = false;
      $scope.autoRefreshPromise = null;
      $scope.enableAutoRefresh = function() {
        jskom.Log.debug("UnreadConfsCtrl - enabling auto-refresh");
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
          jskom.Log.debug("UnreadConfsCtrl - disabling auto-refresh");
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
    '$scope', '$routeParams', '$log', '$window', 'textsService',
    function($scope, $routeParams, $log, $window, textsService) {
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
    'readQueueService', 'messagesService', 'conferencesService', 'textsService',
    'pageTitleService', 'keybindingService', 'readMarkingsService',
    function($scope, $routeParams, $log, $window, $location,
             readQueueService, messagesService, conferencesService, textsService,
             pageTitleService, keybindingService, readMarkingsService) {
      var getText = function(textNo) {
        var p = textsService.getText(textNo);
        p.success(function(data) {
          $log.log("ReaderTextCtrl - getText(" + textNo + ") - success");
          return p;
        }).error(function(data, status) {
          $log.log("ReaderTextCtrl - getText(" + textNo + ") - error");
          if (status == 404) {
            messagesService.showMessage('error', 'No such text',
                                        'No text with number: ' + data.error_status);
          } else {
            messagesService.showMessage('error', 'Failed to get text.', data);
          }
          return p;
        });
        return p;
      };
      
      var appendText = function(text) {
        var last = _.last($scope.texts);
        if (last && last.text_no == text.text_no) {
          // Don't add duplicate texts on the end. (Or is it just more
          // confusing to stop this?)
        } else {
          $scope.texts.push(text);
        }
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
        var p = getText(textNo);
        p.success(function(text) {
          $scope.textIsLoading = false;
          appendText(text);
          $scope.textsIndex = $scope.texts.length-1;
          return p;
        }).error(function () {
          $scope.textIsLoading = false;
          return p;
        });
        return p;
      };
      
      var readQueueWatcher = null
      var getReadQueue = function(confNo) {
        if (readQueueWatcher) {
          readQueueWatcher();
        }
        
        readQueueService.getReadQueueForConference(confNo).
          success(function(readQueue) {
            $log.log("ReaderCtrl - getReadQueueForConference(" + confNo + ") - success");
            $scope.readQueue = readQueue;
            
            readQueueWatcher = $scope.$watch(
              'readQueue.current()', function(newTextNo, oldTextNo) {
                $log.log("ReaderCtrl - watch(readQueue.current()): " + newTextNo);
                if (newTextNo) {
                  showText(newTextNo).success(function(text) {
                    markAsRead(text);
                  });
                }
              });
          }).
          error(function(data, status) {
            $log.log("ReaderCtrl - getReadQueueForConference(" + confNo + ") - error");
            messagesService.showMessage('error', 'Failed to get unread texts.', data);
          });
      };
      getReadQueue($routeParams.confNo);
      
      $scope.textIsLoading = false;
      $scope.texts = [];
      $scope.textsIndex = null;
      $scope.readQueue = null;
      
      /*$scope.getTextNos = function() {
        return _.map($scope.texts, function(text) {
          return text.text_no;
        });
      };*/
      
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
      
      $scope.$watch('textsIndex', function(newTextIndex) {
        //$log.log("ReaderCtrl - watch(textsIndex) :" + newTextIndex);
        if (newTextIndex != null) {
          $scope.text = $scope.texts[newTextIndex];
          angular.element($window).scrollTop(0);
        } else {
          $scope.text = null;
        }
      });
      
      $scope.readNext = function() {
        if ($scope.readQueue) {
          if ($scope.readQueue.isEmpty()) {
            $location.path('/');
          } else {
            $scope.readQueue.moveNext();
          }
        }
      };
      
      $scope.hasPrevious = function() {
        if ($scope.textsIndex > 0) {
          return true;
        }
        return false;
      };
      
      $scope.previous = function() {
        if ($scope.hasPrevious()) {
          --$scope.textsIndex;
        }
      };
      
      $scope.hasNext = function() {
        if ($scope.textsIndex < $scope.texts.length-1) {
          return true;
        }
        return false;
      };
      
      $scope.next = function() {
        if ($scope.hasNext()) {
          ++$scope.textsIndex;
        }
      };
      
      keybindingService.bindLocal('p', 'Show previous text', function() {
        $scope.$apply(function() {
          $scope.previous();
        });
        return false;
      });
      
      keybindingService.bindLocal('n', 'Show next text', function() {
        $scope.$apply(function() {
          $scope.next();
        });
        return false;
      });
      
      $scope.showCommentedTexts = function() {
        $log.log('ReaderCtrl - showCommentedTexts()');
        if ($scope.text && !_.isEmpty($scope.text.comment_to_list)) {
          showText(_.first($scope.text.comment_to_list).text_no);
          
          _.each(_.rest($scope.text.comment_to_list), function(ct) {
            getText(ct.text_no).success(function(text) {
              $log.log("rest: " + text.text_no);
              appendText(text);
            });
          });
        }
      };
      
      // 'å k' works really bad sometimes, probably because of
      // requiring keypress events (doesn't matter if you specify
      // 'keydown' or not).
      keybindingService.bindLocal(',', 'Show commented texts', function() {
        $scope.$apply(function() {
          $scope.showCommentedTexts();
        }, 'keydown');
        return false;
      });
      
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
