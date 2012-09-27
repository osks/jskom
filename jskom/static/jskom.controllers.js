// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.controllers', ['jskom.httpkom', 'jskom.services', 'jskom.settings']).
  controller('ConnectionsCtrl', [
    '$scope', '$rootScope', '$log', '$location',
    'connectionFactory', 'connectionsService', 'httpkom', 'messagesService', 'sessionsService',
    function($scope, $rootScope, $log, $location,
             connectionFactory, connectionsService, httpkom, messagesService, sessionsService) {
      
      // This is a work-around for Twitter Bootstrap dropdown plugin
      // incompatibility with AngularJS. The dropdown plugin stops
      // AngularJS from capturing link clicks, which causes page
      // reloads. Angular in its turn stops the clicks from closing
      // the dropdown when it updates the location. We want to do
      // both!  TODO: Make a directive of this. This is the wrong
      // place for this code.
      jQuery('.dropdown').on('click', function(event) {
        var url = jQuery(event.target).closest('a').attr('href');
        if (url) {
          $scope.$apply(function(scope) {
            $location.url(url);
          });
          jQuery(this).removeClass('open');
          event.preventDefault();
        }
      });
      
      
      $scope.newConnection = function() {
        connectionsService.newConnectionPromise().then(
          function(conn) {
            connectionsService.setCurrentConnection(conn);
          },
          function(response) {
            $log.log("ConnectionsCtrl - newConnection() - error");
            messagesService.showMessage('error', 'Failed to create new connection.',
                                        response.data);
          });
      };
      
      $scope.selectConnection = function(conn) {
        connectionsService.setCurrentConnection(conn);
      };

      $scope.$watch(connectionsService.getConnections, function(newConnections) {
        $scope.connections = newConnections;
      });
      
      $scope.$watch(connectionsService.getCurrentConnection, function(newCurrentConn, oldConn) {
        if (newCurrentConn) {
          $log.log("New current connection (" + newCurrentConn.id + ") - session: " +
                   angular.toJson(newCurrentConn.session));
          $scope.connection = newCurrentConn;
        } else {
          //$log.log("New current connection: " + newCurrentConn);
          $scope.connection = null;
        }
        if (newCurrentConn !== oldConn) {
          // New connection, reset URL.
          $location.url('/');
        }
      });
      
      $scope.logout = function() {
        // We don't actually logout, but rather delete the session
        // directly instead.
        sessionsService.deleteSession($scope.connection, 0).then(
          function() {
            $log.log("ConnectionsCtrl - logout() - success");
            connectionsService.removeConnection($scope.connection);
          },
          function(response) {
            $log.log("ConnectionsCtrl - logout() - error");
            messagesService.showMessage('error', 'Error when logging out.', response.data);
          });
      };
      
      $scope.servers = null;
      connectionsService.getServers().then(
        function(servers) {
          $log.log("ConnectionsCtrl - getServers() - success");
          $scope.servers = servers;
          if (!$scope.connection) {
            $scope.newConnection();
          }
        },
        function(response) {
          $log.log("ConnectionsCtrl - getServers() - error");
          messagesService.showMessage('error', 'Failed to get server list.', response.data);
        });
    }
  ]).
  controller('SessionCtrl', [
    '$scope', '$log', '$location', '$window',
    'messagesService', 'keybindingService',
    function($scope, $log, $location, $window,
             messagesService, keybindingService) {
      $scope.session = null;
      $scope.$watch('connection', function(newConnection) {
        if (newConnection) {
          //$log.log("SessionCtrl - new session: " + angular.toJson(newConnection.session));
          $scope.session = newConnection.session;
        } else {
          $scope.session = null;
        }
      });
      
      keybindingService.bindGlobal('i', 'New text...', function(e) {
        $scope.$apply(function() {
          $location.url('/texts/new');
        });
        return false;
      });

      keybindingService.bindGlobal('g', 'Go to conference...', function(e) {
        $scope.$apply(function() {
          $location.url('/conferences/go-to');
        });
        return false;
      });

      keybindingService.bindGlobal('p', 'Browser history back', function(e) {
        $window.history.back();
        return false;
      });
      
      keybindingService.bindGlobal('n', 'Browser history forward', function(e) {
        $window.history.forward();
        return false;
      });
    }
  ]).
  controller('LoginTabsCtrl', [
    '$scope', '$log', 'pageTitleService', 'sessionsService',
    function($scope, $log, pageTitleService, sessionsService) {
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
      
      $scope.person = sessionsService.newPerson();
      $scope.$on('jskom:person:created', function($event, persNo) {
        $scope.person = sessionsService.newPerson(persNo);
        $scope.loginActiveTab = 'login';
      });
    }
  ]).
  controller('LoginCtrl', [
    '$scope', '$log', 'sessionsService', 'messagesService', 'connectionsStorage',
    function($scope, $log, sessionsService, messagesService, connectionsStorage) {
      $scope.isLoggingIn = false;
      
      $scope.reset = function() {
        $scope.isReseting = true;
        sessionsService.deleteSession(
          $scope.connection, $scope.connection.session.session_no).then(
            function(response) {
              $log.log("LoginCtrl - reset() - success");
              $scope.person = sessionsService.newPerson();
              $scope.isReseting = false;
            },
            function(response) {
              $log.log("LoginCtrl - reset() - error");
              messagesService.showMessage('error', 'Failed to reset login.', response.data);
              $scope.isReseting = false;
            });
      };
      
      $scope.login = function() {
        $scope.isLoggingIn = true;
        sessionsService.login($scope.connection, $scope.person).then(
          function(response) {
            $log.log("LoginCtrl - login() - success");
            messagesService.clearAll();
            $scope.isLoggingIn = false;
          },
          function(response) {
            $log.log("LoginCtrl - login() - error");
            messagesService.showMessage('error', 'Failed to login.', response.data);
            $scope.isLoggingIn = false;
          });
      };
    }
  ]).
  controller('NewPersonCtrl', [
    '$scope', '$log', '$location',
    'personsService', 'messagesService', 'sessionsService',
    function($scope, $log, $location,
             personsService, messagesService, sessionsService) {
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
        return personsService.createPerson($scope.connection, $scope.person).then(
          function(response) {
            $log.log("NewPersonCtrl - createPerson() - success");
            $scope.isCreating = false;
            messagesService.showMessage('success', 'Successfully created person.');
            $scope.$emit('jskom:person:created', response.data.pers_no);
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
  controller('MessagesCtrl', [
    '$scope', 'messagesService', '$log',
    function($scope, messagesService, $log) {
      $scope.$watch(messagesService.getMessages, function(newMessages) {
        $scope.messages = newMessages;
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
        return false;
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
    '$scope', '$location', '$log', '$timeout', '$q',
    'conferencesService', 'pageTitleService', 'messagesService', 'keybindingService',
    'membershipsService',
    function($scope, $location, $log, $timeout, $q,
             conferencesService, pageTitleService, messagesService, keybindingService,
             membershipsService) {
      pageTitleService.set("Unread conferences");
      
      var sortMembershipsByPriority = function(memberships) {
        var sortedMemberships = _.sortBy(memberships, function(ms) {
          return ms.priority;
        });
        sortedMemberships.reverse();
        return sortedMemberships;
      };
      
      $scope.load = function(allowCache) {
        $scope.unreadMemberships = [];
        $scope.isLoading = true;
        return membershipsService.getUnreadMemberships(
          $scope.connection, { cache: allowCache }).then(
            function(memberships) {
              $log.log("UnreadConfsCtrl - getUnreadMemberships() - success");
              $scope.unreadMemberships = sortMembershipsByPriority(memberships);
              $scope.isLoading = false;
            },
            function(response) {
              $log.log("UnreadConfsCtrl - getUnreadMemberships() - error");
              $scope.isLoading = false;
              if (response.status != 401) {
                messagesService.showMessage('error', 'Failed to get unread conferences.',
                                            response.data);
              }
              return $q.reject(response);
            });
      };
      $scope.enableAutoRefresh = function() {
        $log.log("UnreadConfsCtrl - enabling auto-refresh");
        $scope.autoRefreshing = true;
        var scheduleReload = function() {
          $scope.autoRefreshPromise = $timeout(function() {
            $scope.load(false).then(
              function() {
                scheduleReload();
              },
              function() {
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
      
      // We watch the connection because this controller doesn't
      // nesscerily get recreated when the connection changes (it is
      // only recreated if the URL changes).
      $scope.$watch('connection', function(newConnection) {
        $scope.disableAutoRefresh();
        if (newConnection) {
          $scope.load(true);
          $scope.enableAutoRefresh();
        }
      });
      
      $scope.readFirstConference = function() {
        if ($scope.unreadMemberships.length > 0) {
          $location.url("/conferences/" +
                        _.first($scope.unreadMemberships).conference.conf_no + "/unread/");
        }
      };
      
      keybindingService.bindLocal(['space'], 'Read first conference', function(e) {
        if (_.size($scope.unreadMemberships) > 0) {
          $scope.$apply(function() {
            $scope.readFirstConference();
          });
        }
        return false;
      });
      
      keybindingService.bindLocal('R', 'Refresh', function(e) {
        $scope.$apply(function() {
          if (!$scope.isLoading) {
            $scope.load(false);
          }
        });
        return false;
      });
      
      keybindingService.bindLocal('e', 'Set unread...', function(e) {
        $log.log("local");
        $scope.$apply(function() {
          $location.url('/conferences/set-unread');
        });
        return false;
      });
    }
  ]).
  controller('SetUnreadTextsCtrl', [
    '$scope', '$location', '$routeParams', '$log',
    'membershipsService', 'pageTitleService', 'messagesService', 'keybindingService',
    function($scope, $location, $routeParams, $log,
             membershipsService, pageTitleService, messagesService, keybindingService) {
      pageTitleService.set("Set number of unread texts");
      
      $scope.confNo = $routeParams.confNo || null;
      $scope.noOfUnread = 0;
      $scope.isLoading = false;

      $scope.setNumberOfUnreadTexts = function() {
        $scope.isLoading = true;
        membershipsService.setNumberOfUnreadTexts(
          $scope.connection, $scope.confNo, $scope.noOfUnread).then(
            function() {
              $log.log("SetUnreadTextsCtrl - setNumberOfUnreadTexts() - success");
              $scope.isLoading = false;
              messagesService.showMessage('success', 'Successfully set number of unread texts.',
                                          '', true);
              $location.url('/');
            },
            function(response) {
              $log.log("SetUnreadTextsCtrl - setNumberOfUnreadTexts() - error");
              $scope.isLoading = false;
              messagesService.showMessage('error', 'Failed to set number of unread texts.',
                                          response.data);
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
      $scope.text = null;
      $scope.commentedText = null;
      $scope.activeTab = 'simple';
      
      $scope.commentTypes = [
        { name: 'Comment', type: 'comment' },
        { name: 'Footnote', type: 'footnote' }
      ];
      
      $scope.recipientTypes = [
        { name: 'To', type: 'to' },
        { name: 'CC', type: 'cc' },
        { name: 'BCC', type: 'bcc' }
      ];
      
      $scope.newRecipient = function() {
        return { type: 'to', conf_name: '' }
      };
      
      var newEmptyText = function() {
        return {
          recipient_list: [],
          content_type: 'text/plain',
          subject: '',
          body: ''
        };
      };
      
      var makeCommentTo = function(comment, commentedText) {
        comment.comment_to_list = [
          { type: 'comment', text_no: commentedText.text_no }
        ];
        
        comment.subject = commentedText.subject;
        
        _.each(commentedText.recipient_list, function(r) {
          if (r.type == 'to') {
            comment.recipient_list.push(_.clone(r));
          }
        });
      };
      
      $scope.selectTab = function(tab) {
        $scope.activeTab = tab;
      };
      
      $scope.isTabActive = function(tab) {
        if ($scope.activeTab == tab) {
          return 'active';
        } else {
          return '';
        }
      };

      $scope.returnUrl = $location.search().returnUrl;
      $scope.goToReturnUrl = function() {
        $location.url($scope.returnUrl);
      };
      
      if ($location.search().commentTo) {
        var commentToTextNo = parseInt($location.search().commentTo)
        $scope.activeTab = 'simple';
        
        textsService.getText($scope.connection, commentToTextNo).then(
          function(response) {
            $log.log("NewTextCtrl - getText(" + commentToTextNo + ") - success");
            
            var newText = newEmptyText();
            makeCommentTo(newText, response.data);
            $scope.commentedText = response.data;
            $scope.text = newText;
            pageTitleService.set("New comment to " + $scope.commentedText.text_no);
          },
          function(response) {
            $log.log("NewTextCtrl - getText(" + commentToTextNo + ") - error");
            messagesService.showMessage('error', 'Failed to get text to comment.', response.data);
          });
      } else {
        var newText = newEmptyText();
        newText.recipient_list.push($scope.newRecipient());
        $scope.text = newText;
        $scope.activeTab = 'advanced';
      }
      
      $scope.createText = function() {
        $scope.isCreating = true;
        textsService.createText($scope.connection, $scope.text).then(
          function(response) {
            $log.log("NewTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + response.data.text_no + ' was created.',
                                        true);
            $scope.isCreating = false;
            if ($scope.returnUrl) {
              $scope.goToReturnUrl();
            } else {
              $location.url('/texts/' + response.data.text_no);
            }
          },
          function(response) {
            $log.log("NewTextCtrl - createText() - error");
            messagesService.showMessage('error', 'Failed to create text.', response.data);
            $scope.isCreating = false;
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
        textsService.getText($scope.connection, textNo).then(
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
      
      $scope.textNo = $routeParams.textNo;
      showText($scope.textNo);
    }
  ]).
  controller('TextCtrl', [
    '$scope', '$log', '$window', '$location',
    'httpkomServer', 'keybindingService', 'readMarkingsService', 'textsService',
    'messagesService',
    function($scope, $log, $window, $location,
             httpkomServer, keybindingService, readMarkingsService, textsService,
             messagesService) {
      $scope.readmarkIsLoading = false;
      $scope.textMode = "default";
      
      $scope.writeComment = function() {
        if ($scope.text) {
          var returnUrl = $location.url();
          $location.url("/texts/new");
          $location.search({ returnUrl: returnUrl,
                             commentTo: $scope.text.text_no });
        }
      };
      
      keybindingService.bindLocal('k', 'Write comment', function(e) {
        $scope.$apply(function() {
          $scope.writeComment();
        });
        return false;
      });
      
      $scope.markAsRead = function() {
        if ($scope.text) {
          var text = $scope.text;
          $scope.readmarkIsLoading = true;
          readMarkingsService.createGlobalReadMarking($scope.connection, text).then(
            function(response) {
              $log.log("TextCtrl - markAsRead(" + text.text_no + ") - success");
              $scope.readmarkIsLoading = false;
              text._is_unread = false;
            },
            function(response) {
              $log.log("TextCtrl - markAsRead(" + text.text_no + ") - error");
              $scope.readmarkIsLoading = false;
              messagesService.showMessage('error', 'Failed to mark text as read.', response.data);
            });
        }
      };
      
      $scope.markAsUnread = function() {
        if ($scope.text) {
          var text = $scope.text;
          $scope.readmarkIsLoading = false;
          readMarkingsService.deleteGlobalReadMarking($scope.connection, text).then(
            function(response) {
              $log.log("TextCtrl - markAsUnread(" + text.text_no + ") - success");
              $scope.readmarkIsLoading = false;
              text._is_unread = true;
            },
            function(response) {
              $log.log("TextCtrl - markAsUnread(" + text.text_no + ") - error");
              $scope.readmarkIsLoading = false;
              messagesService.showMessage('error', 'Failed to mark text as read.', response.data);
            });
        }
      };
    }
  ]).
  controller('GoToConfCtrl', [
    '$scope', '$location', '$log', 'pageTitleService',
    function($scope, $location, $log, pageTitleService) {
      pageTitleService.set("Go to conference");
      
      $scope.confNo = null;
      $scope.goToConf = function() {
        if ($scope.confNo) {
          $location.path('/conferences/' + parseInt($scope.confNo));
        }
      };
    }
  ]).
  controller('ShowConfCtrl', [
    '$scope', '$routeParams', '$log', '$location',
    'pageTitleService', 'conferencesService', 'keybindingService', 'messagesService',
    'membershipsService',
    function($scope, $routeParams, $log, $location,
             pageTitleService, conferencesService, keybindingService, messagesService,
             membershipsService) {
      $scope.conf = null;
      $scope.isLoadingMembership = false;
      $scope.isJoining = false;
      $scope.isLeaving = false;
      $scope.membership = null;
      
      var getMembership = function(confNo) {
        $scope.isLoadingMembership = true;
        $scope.membership = null;
        membershipsService.getMembership($scope.connection, confNo).then(
            function(membership) {
              $log.log("ShowConfCtrl - getMembership(" + confNo + ") - success");
              $scope.isLoadingMembership = false;
              $scope.membership = membership;
            },
            function(response) {
              $log.log("ShowConfCtrl - getMembership(" + confNo + ") - error");
              $scope.isLoadingMembership = false;
              if (response.data.error_code === 13) {
                // NotMember
              } else {
                messagesService.showMessage('error',
                                            'Failed to get conference membership.',
                                            response.data);
              }
            });
      };
      
      $scope.joinConf = function() {
        var confNo = $scope.conf.conf_no;
        $scope.isJoining = true;
        membershipsService.addMembership($scope.connection, confNo).then(
          function(response) {
            $log.log("ShowConfCtrl - addMembership(" + confNo + ") - success");
            $scope.isJoining = false;
            getMembership(confNo); // Refresh membership
            messagesService.showMessage('success', 'Successfully joined conference.');
          },
          function(response) {
            $log.log("ShowConfCtrl - addMembership(" + confNo + ") - error");
            $scope.isJoining = false;
            messagesService.showMessage('error', 'Failed to join conference.', response.data);
          });
      };
      
      $scope.leaveConf = function() {
        var confNo = $scope.conf.conf_no;
        $scope.isLeaving = true;
        membershipsService.deleteMembership($scope.connection, confNo).then(
          function(response) {
            $log.log("ShowConfCtrl - deleteMembership(" + confNo + ") - success");
            $scope.isLeaving = false;
            getMembership(confNo); // Refresh membership
            messagesService.showMessage('success', 'Successfully left conference.');
          },
          function(response) {
            $log.log("ShowConfCtrl - deleteMembership(" + confNo + ") - error");
            $scope.isLeaving = false;
            messagesService.showMessage('error', 'Failed to leave conference.', response.data);
          });
      };
      
      conferencesService.getConference($scope.connection, $routeParams.confNo, false).then(
        function(response) {
          $log.log("ShowConfCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = response.data;
          getMembership($scope.conf.conf_no);
          pageTitleService.set($scope.conf.name);
        },
        function(response) {
          $log.log("ShowConfCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', response.data);
          pageTitleService.set("");
        });
      
      keybindingService.bindLocal('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          if ($scope.conf) {
            var confNo = $scope.conf.conf_no;
            $location.path("/conferences/" + confNo + "/set-unread");
          }
        });
        return false;
      });
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location',
    'messagesService', 'conferencesService', 'textsService',
    'pageTitleService', 'keybindingService', 'readerFactory',
    'sessionsService', 'membershipsService',
    function($scope, $rootScope, $routeParams, $log, $window, $location,
             messagesService, conferencesService, textsService,
             pageTitleService, keybindingService, readerFactory,
             sessionsService, membershipsService) {
      $scope.textIsLoading = false;
      $scope.text = null;
      $scope.readerIsLoading = false;
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
            
            if ($location.search().text != text.text_no) {
              if ($location.search().text == null) {
                $location.replace();
              }
              $location.search('text', text.text_no);
            }
            
            // This is a bad way to do this.
            // We do this because .navbar-fixed-top changes from fixed
            // to static based on media queries.
            /*if (angular.element('.navbar-fixed-top').css('position') == 'fixed') {
              angular.element($window).scrollTop(0);
            } else {
              angular.element($window).scrollTop(40);
            }*/
            // If we scroll to 0, the android browser will show the
            // toolbar/address field.
            
            angular.element($window).scrollTop(1);
          },
          function(response) {
            $scope.textIsLoading = false;
            messagesService.showMessage('error', 'Failed to get text.', response.data);
          });
      };
      
      var showText = function(textNo) {
        if (textNo) {
          setText(textsService.getText($scope.connection, textNo).then(
            function(response) {
              return response.data;
            }));
        }
      };
      
      $rootScope.$on('$routeUpdate', function(event) {
        showText($routeParams.text);
        // We manually clear messages. It is done on route change,
        // but we don't want to trigger route change on chaning
        // text parameter, so we need to clear messages ourself.
        messagesService.clearAll(true);
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
          pageTitleService.set("Reading " + newConf.conf_name);
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
      
      var getReader = function(confNo, allowCache) {
        $scope.readerIsLoading = true;
        membershipsService.getMembership($scope.connection, confNo, { cache: allowCache }).then(
          function(membership) {
            $log.log("ReaderCtrl - getReader(" + confNo + ") - success");
            $scope.conf = membership.conference;
            
            var unreadQueue = readerFactory.createUnreadQueue(
              $scope.connection, membership.unread_texts);
            var reader = readerFactory.createReader($scope.connection, unreadQueue);
            
            if ($routeParams.text) {
              reader.unshiftPending($routeParams.text);
            }
            if (!reader.isEmpty()) {
              setText(reader.shift());
            }
            
            // If getting the reader succeeded, we know we are a
            // member of the conference and can change the working
            // conference to it.
            sessionsService.changeConference($scope.connection, confNo);
            
            $scope.reader = reader;
            $scope.readerIsLoading = false;
          },
          function(response) {
            $log.log("ReaderCtrl - getReader(" + confNo + ") - error");
            $scope.readerIsLoading = false;
            messagesService.showMessage('error', 'Failed to get reader.', response.data);
          });
      };
      
      getReader($routeParams.confNo, true);
      
      $scope.refresh = function() {
        getReader($routeParams.confNo, false);
      };
      
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
      
      keybindingService.bindLocal('R', 'Refresh', function(e) {
        $scope.$apply(function() {
          if (!$scope.readerisLoading) {
            $scope.refresh();
          }
        });
        return false;
      });
      
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
        return false;
      });
    }
  ]);
