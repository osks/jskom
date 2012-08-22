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
        $location.url("/conferences/" + _.first($scope.unreadConfs).conf_no + "/unread/");
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
          $location.url('/conferences/set-unread');
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
            $location.url('/');
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
        textsService.createText($scope.newText).then(
          function(response) {
            $log.log("CreateTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + response.data.text_no + ' was created.');
            $location.url('/texts/' + response.data.text_no);
          },
          function(response) {
            $log.log("CreateTextCtrl - createText() - error");
            messagesService.showMessage('error', 'Failed to create text.', response.data);
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
        textsService.getText(textNo).then(
          function(response) {
            $log.log("ShowTextCtrl - getText(" + textNo + ") - success");
            $scope.textIsLoading = false;
            $scope.text = response.data;
            angular.element($window).scrollTop(0);
          },
          function(response) {
            $log.log("ShowTextCtrl - getText(" + textNo + ") - error");
            $scope.textIsLoading = false;
            $scope.text = null;
            if (response.status == 404) {
              messagesService.showMessage('error', 'No such text',
                                          'No text with number: ' + response.data.error_status);
            } else {
              messagesService.showMessage('error', 'Failed to get text.', response.data);
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
      $scope.isCommentFormVisible = false;
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
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location',
    'messagesService', 'conferencesService', 'textsService',
    'pageTitleService', 'keybindingService', 'readMarkingsService', 'readerService',
    'sessionsService',
    function($scope, $rootScope, $routeParams, $log, $window, $location,
             messagesService, conferencesService, textsService,
             pageTitleService, keybindingService, readMarkingsService, readerService,
             sessionsService) {
      $scope.textIsLoading = false;
      $scope.text = null;
      $scope.reader = null;
      
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
      
      var setText = function(textPromise) {
        $scope.textIsLoading = true;
        textPromise.then(
          function(text) {
            $scope.textIsLoading = false;
            $scope.text = text;
            
            if ($location.search.text != text.text_no) {
              $location.search('text', text.text_no);
            }
            
            // This is a bad way to do this.
            if (angular.element('#jskomNavBar').css('position') == 'fixed') {
              angular.element($window).scrollTop(0);
            } else {
              angular.element($window).scrollTop(60);
            }
          },
          function(response) {
            $scope.textIsLoading = false;
            messagesService.showMessage('error', 'Failed to get text.', response.data);
          });
      };
      
      var showText = function(textNo) {
        if (textNo) {
          setText(textsService.getText(textNo).then(
            function(response) {
              return response.data;
            }));
        }
      };
      
      $rootScope.$on('$routeUpdate', function(event) {
        showText($routeParams.text);
      });
      
      $scope.$on('jskom:a:text', function($event, textNo, href) {
        // When clicking on text links in the reader, we just show the
        // text inside the reader, instead of going to the "show text"
        // page.
        //$log.log("ReaderCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        showText(textNo);
      });
      
      $scope.$watch('conf', function(newConf) {
        if (newConf) {
          pageTitleService.set("Reading " + newConf.name);
        } else {
          pageTitleService.set("");
        }
      });
      
      $scope.readNext = function() {
        if (!$scope.textIsLoading) {
          if ($scope.reader.isEmpty()) {
            $location.url('/');
          } else {
            setText($scope.reader.shift());
          }
        }
      };
      
      conferencesService.getConference($routeParams.confNo).
        success(function(data) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = data;
        }).
        error(function(data, status) {
          $log.log("ReaderCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', data);
        });
      
      readerService.getReader($routeParams.confNo).then(
        function(reader) {
          var confNo = $routeParams.confNo;
          $log.log("ReaderCtrl - getReader(" + confNo + ") - success");
          
          if ($routeParams.text) {
            reader.unshiftPending($routeParams.text);
          }
          setText(reader.shift());
          
          // If getting the reader succeeded, we know we are a
          // member of the conference and can change the working
          // conference to it.
          sessionsService.changeConference(
            sessionsService.getCurrentSessionId(),
            confNo);
          
          $scope.reader = reader;
        },
        function(response) {
          var confNo = $routeParams.confNo;
          $log.log("ReaderCtrl - getReader(" + confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get reader.', response.data);
          return response;
        });
      
      $scope.showCommented = function() {
        $log.log('ReaderCtrl - showCommented()');
        if ($scope.text && !_.isEmpty($scope.text.comment_to_list)) {
          $scope.reader.unshiftPending.apply(
            $scope.reader,
            _.map($scope.text.comment_to_list, function(ct) {
              return ct.text_no;
            }));
          
          setText($scope.reader.shift());
        }
      };
      
      $scope.showAllComments = function() {
        $log.log('ReaderCtrl - showAllComments()');
        if ($scope.text && !_.isEmpty($scope.text.comment_in_list)) {
          $scope.reader.unshiftPending.apply(
            $scope.reader,
            _.map($scope.text.comment_in_list, function(ci) {
              return ci.text_no;
            }));
          
          setText($scope.reader.shift());
        }
      };
      
      keybindingService.bindLocal(',', 'Show commented', function() {
        $scope.$apply(function() {
          $scope.showCommented();
        });
        return false;
      });
      
      // 'å a k' works really bad sometimes, probably because of
      // requiring keypress events (doesn't matter if you specify
      // 'keydown' or not).
      /*keybindingService.bindLocal('å a k', 'Show all comments', function() {
        $scope.$apply(function() {
          $scope.showAllComments();
        });
        return false;
      });*/
      
      keybindingService.bindLocal('space', 'Read next unread text', function(e) {
        if (isScrolledIntoView(angular.element('#jskomBelowText'))) {
          $scope.$apply(function() {
            // Check that the read next button is visible if we used space
            $scope.readNext();
          });
          return false;
        } else {
          return true;
        }
      });
      
      keybindingService.bindLocal('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          if ($scope.conf) {
            var confNo = $scope.conf.conf_no;
            $location.url("/conferences/" + confNo + "/set-unread");
          }
        });
      });
    }
  ]);
