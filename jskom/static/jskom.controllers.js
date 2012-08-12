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
      };
      $scope.load();
      
      
      $scope.refresherPromise = null;
      $scope.startRefresher = function() {
        jskom.Log.debug("UnreadConfsCtrl - starting auto-refresher");
        var scheduleReload = function() {
          $scope.refresherPromise = $timeout(function() {
            $scope.load();
            scheduleReload();
          }, 2*60*1000);
        }
        scheduleReload();
      };
      $scope.$on('$destroy', function() {
        if ($scope.refresherPromise) {
          jskom.Log.debug("UnreadConfsCtrl - stopping auto-refresher");
          $timeout.cancel($scope.refresherPromise);
        }
      });
      $scope.startRefresher();
      
      
      $scope.gotoFirstConference = function() {
        $location.path("/conferences/" + _.first($scope.unreadConfs).conf_no + "/unread/");
      };
      
      keybindingService.bindLocal(['space', 'n'], 'Go to first conference', function(e) {
        if (_.size($scope.unreadConfs) > 0) {
          $scope.$apply(function() {
            //$location.path("/conferences/" + _.first($scope.unreadConfs).conf_no + "/unread/");
            $scope.gotoFirstConference();
          });
        }
      });
      // No key binding for set_unread right now. It doesn't feel right to have key bindings
      // for going to separate pages. I could accept having 'e' bound when you're
      // already in a conference and have it show a "pop-up" or something.
      /*keybindingService.bindLocal('e', 'Only read last...', function(e) {
        $scope.$apply(function() {
          $location.path('/conferences/set-unread');
        });
      });*/
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

      // Not working that good, since it won't capture inside input
      // fields (which is usually good, but makes it slow/useless for
      // this). What key should we use?
      /*keybindingService.bindLocal('ctrl+enter', 'Post text', function(e) {
        $log.log("NewTextCtrl - bind(ctrl+enter) - pressed");
      });*/
    }
  ]).
  controller('ShowTextCtrl', [
    '$scope', '$routeParams', 'textsService', '$log', '$location',
    'messagesService', 'pageTitleService', 'keybindingService',
    function($scope, $routeParams, textsService, $log, $location,
             messagesService, pageTitleService, keybindingService) {
      var showText = function(textNo) {
        $scope.textNo = textNo;
        $scope.isLoading = true;
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
      };
      
      showText($routeParams.textNo);
      
      $scope.$watch('text', function(newText) {
        if (newText) {
          pageTitleService.set("Text " + newText.text_no);
        } else {
          pageTitleService.set("");
        }
      });
      
      keybindingService.bindLocal('p', 'Show first commented text', function() {
        $scope.$apply(function() {
          var textNo = _.first(_.map($scope.text.comment_to_list, function(ct) {
            return ct.text_no
          }));
          if (textNo) {
            showText(textNo);
          }
        });
        return false;
      });
      
      keybindingService.bindLocal('n', 'Show first comment', function(e) {
        $scope.$apply(function() {
          var textNo = _.first(_.map($scope.text.comment_in_list, function(ci) {
            return ci.text_no
          }));
          if (textNo) {
            showText(textNo);
          }
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
      
      $scope.readNext = function() {
        if (readQueue.isEmpty()) {
          $location.path('/');
        } else {
          readQueue.moveNext();
        }
      };
      
      keybindingService.bindLocal('p', 'Show first commented text', function() {
        $scope.$apply(function() {
          var textNo = _.first(_.map($scope.text.comment_to_list, function(ct) {
            return ct.text_no
          }));
          if (textNo) {
            showText(textNo, false);
          }
        });
        return false;
      });
      
      keybindingService.bindLocal('n', 'Show first comment', function(e) {
        $scope.$apply(function() {
          var textNo = _.first(_.map($scope.text.comment_in_list, function(ci) {
            return ci.text_no
          }));
          if (textNo) {
            showText(textNo, false);
          }
        });
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
