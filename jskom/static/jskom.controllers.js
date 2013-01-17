// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.controllers', ['jskom.httpkom', 'jskom.services', 'jskom.settings']).
  controller('SidebarCtrl', [
    '$scope', '$log', '$timeout',
    'messagesService', 'keybindingService', 'membershipListService',
    function($scope, $log, $timeout,
             messagesService, keybindingService, membershipListService) {
      $scope.membershipList = null;
      $scope.readMemberships = null;
      $scope.unreadMemberships = null;
      
      $scope.$watch('connection', function (newConnection) {
        if (newConnection != null) {
          membershipListService.getMembershipList($scope.connection).then(
            function (membershipList) {
              $log.log("MembershipsCtrl - getMembershipList() - success");
              $scope.membershipList = membershipList;
            },
            function () {
              $log.log("MembershipsCtrl - getMembershipList() - error");
              $scope.membershipList = null;
            });
        } else {
          $scope.membershipList = null;
        }
      });
      
      $scope.pageSize = 100;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;
      
      $scope.$watch('membershipList.getReadMemberships()', function (newReadMemberships) {
        //$log.log("MembershipsCtrl - watch(membershipList.getReadMemberships())");
        //$log.log(newReadMemberships);
        $scope.readMemberships = newReadMemberships;
        
        $scope.currentPage = 0;
        if (newReadMemberships != null) {
          $scope.numberOfPages = Math.ceil($scope.readMemberships.length / $scope.pageSize);
        } else {
          $scope.numberOfPages = 0;
        }
      });
      
      $scope.previousPage = function() {
        $scope.currentPage = ($scope.currentPage < 1 ? 0 : $scope.currentPage - 1);
      };
      $scope.nextPage = function() {
        $scope.currentPage = ($scope.currentPage >= $scope.numberOfPages -1 ?
                              $scope.currentPage : $scope.currentPage + 1);
      };
      
      $scope.$watch('membershipList.getUnreadMemberships()', function (newUnreadMemberships) {
        //$log.log("MembershipsCtrl - watch(membershipList.getUnreadMemberships())");
        //$log.log(newUnreadMemberships);
        $scope.unreadMemberships = newUnreadMemberships;
      });
    }
  ]).
  controller('ConnectionsCtrl', [
    '$scope', '$rootScope', '$log', '$location',
    'connectionFactory', 'connectionsService', 'httpkom', 'messagesService', 'sessionsService',
    'keybindingService',
    function($scope, $rootScope, $log, $location,
             connectionFactory, connectionsService, httpkom, messagesService, sessionsService,
             keybindingService) {
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
        var curConn = connectionsService.getCurrentConnection();
        if (conn !== curConn) {
          messagesService.clearAll();
          $location.url('/');
          conn.userIsActive();
        }
        connectionsService.setCurrentConnection(conn);
      };
      
      $scope.$watch(connectionsService.getConnections, function(newConnMap) {
        $scope.connections = newConnMap;
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
            connectionsService.removeConnection($scope.connection);
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
      
      
      $scope.selectNextConnection = function() {
        if (_.size($scope.connections) > 1) {
          var newConn;
          var connections = _.sortBy(_.values($scope.connections), function(conn) {
            return conn.id;
          });
          
          if ($scope.connection) {
            var connectionIds = _.map(connections, function(conn) { return conn.id; });
            var index = connectionIds.indexOf($scope.connection.id);
            if (index + 1 < connectionIds.length) {
              newConn = connections[index+1];
            } else {
              newConn = _.first(connections);
            }
          } else {
            newConn = _.first(connections);
          }
          
          $scope.selectConnection(newConn);
        }
      };
      
      keybindingService.bindGeneral('N', 'Next LysKOM session', function() {
        $scope.$apply(function() {
          $scope.selectNextConnection();
        });
        return false;
      });
    }
  ]).
  controller('SessionCtrl', [
    '$scope', '$log', '$location', '$window',
    'messagesService', 'keybindingService',
    function($scope, $log, $location, $window,
             messagesService, keybindingService) {
      keybindingService.bindGeneral('i', 'New text...', function(e) {
        $scope.$apply(function() {
          $location.url('/texts/new');
        });
        return false;
      });
      
      keybindingService.bindGeneral('g', 'Go to conference...', function(e) {
        $scope.$apply(function() {
          $location.url('/conferences/go-to');
        });
        return false;
      });
      
      keybindingService.bindGeneral('p', 'Browser history back', function(e) {
        $window.history.back();
        return false;
      });
      
      keybindingService.bindGeneral('n', 'Browser history forward', function(e) {
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
        if ($scope.connection.isConnected()) {
          $scope.isReseting = true;
          sessionsService.deleteSession(
            $scope.connection, $scope.connection.session.session_no).then(
              function() {
                $log.log("LoginCtrl - reset() - success");
                $scope.person = sessionsService.newPerson();
                $scope.isReseting = false;
              },
              function(response) {
                $log.log("LoginCtrl - reset() - error");
                messagesService.showMessage('error', 'Failed to reset login.', response.data);
                $scope.isReseting = false;
              });
        } else {
          $scope.person = sessionsService.newPerson();
        }
      };
      
      $scope.login = function() {
        $scope.isLoggingIn = true;
        sessionsService.login($scope.connection, $scope.person).then(
          function() {
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
          function(person) {
            $log.log("NewPersonCtrl - createPerson() - success");
            $scope.isCreating = false;
            messagesService.showMessage('success', 'Successfully created person.');
            $scope.$emit('jskom:person:created', person.pers_no);
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
    '$scope', '$log', 'keybindingService', 'modernizr',
    function($scope, $log, keybindingService, modernizr) {
      $scope.isVisible = false;
      $scope.hasTouch = modernizr.touch;
      
      keybindingService.bindGeneral('?', 'Show this help (toggle)', function(e) {
        $scope.$apply(function() {
          $scope.isVisible = !$scope.isVisible;
        });
        return false;
      });
      
      $scope.$watch(keybindingService.getGeneralBindings, function(newGeneralBindings) {
        $scope.generalKeys = newGeneralBindings;
      });
      
      $scope.$watch(keybindingService.getPageSpecificBindings, function(newPageSpecificBindings) {
        $scope.pageSpecificKeys = newPageSpecificBindings;
      });
    }
  ]).
  controller('UnreadConfsCtrl', [
    '$scope', '$location', '$log',
    'conferencesService', 'pageTitleService', 'messagesService', 'keybindingService',
    'membershipListService',
    function($scope, $location, $log,
             conferencesService, pageTitleService, messagesService, keybindingService,
             membershipListService) {
      pageTitleService.set("Unread conferences");
      
      $scope.isLoading = false;
      $scope.$watch('connection', function (newConnection) {
        if (newConnection != null) {
          $scope.isLoading = true;
          membershipListService.getMembershipList($scope.connection).then(
            function (membershipList) {
              $log.log("UnreadConfsCtrl - getMembershipList() - success");
              $scope.isLoading = false;
              $scope.membershipList = membershipList;
            },
            function () {
              $log.log("UnreadConfsCtrl - getMembershipList() - error");
              $scope.isLoading = false;
              $scope.membershipList = null;
            });
        } else {
          $scope.membershipList = null;
        }
      });
      
      $scope.$watch('membershipList.getUnreadMemberships()', function (newUnreadMemberships) {
        //$log.log("UnreadConfsCtrl - watch(membershipList.getUnreadMemberships())");
        $scope.unreadMemberships = newUnreadMemberships;
      });
      
      $scope.$watch('unreadMemberships', function(newUnreadMemberships) {
        if (newUnreadMemberships != null && newUnreadMemberships.length > 0) {
          var unreadCount = _.reduce(newUnreadMemberships, function(count, membership) {
            return count + membership.no_of_unread;
          }, 0);
          
          unreadCount = unreadCount == 0 ? "No" : unreadCount;
          pageTitleService.set(unreadCount + " unread in " + newUnreadMemberships.length +
                               " conference(s)");
        } else {
          pageTitleService.set("No unread conferences");
        }
      });
      
      $scope.readFirstConference = function() {
        if ($scope.unreadMemberships.length > 0) {
          $location.url("/conferences/" +
                        _.first($scope.unreadMemberships).conference.conf_no + "/unread/");
        }
      };
      
      // TODO: This is more "global", so it shouldn't just be a button
      // and keybinding on the unread conference page.
      $scope.refreshUnread = function() {
        if (!$scope.isLoading && $scope.membershipList != null) {
          $scope.connection.userIsActive();
          $scope.isLoading = true;
          $scope.membershipList.refreshUnread().then(
            function () {
              $scope.isLoading = false;
            },
            function () {
              $scope.isLoading = false;
            });
        }
      };
      keybindingService.bindGeneral('R', 'Refresh', function(e) {
        $scope.$apply(function() {
          $scope.refreshUnread();
        });
        return false;
      });

      
      keybindingService.bindPageSpecific('space', 'Read first conference', function(e) {
        if ($scope.unreadMemberships.length > 0) {
          $scope.$apply(function() {
            $scope.readFirstConference();
          });
        }
        return false;
      });
      
      keybindingService.bindPageSpecific('e', 'Set unread...', function(e) {
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
        return { type: 'to', recpt: {} }
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
          function(text) {
            $log.log("NewTextCtrl - getText(" + commentToTextNo + ") - success");
            
            var newText = newEmptyText();
            makeCommentTo(newText, text);
            $scope.commentedText = text;
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
          function(data) {
            $log.log("NewTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + data.text_no + ' was created.',
                                        true);
            $scope.isCreating = false;
            if ($scope.returnUrl) {
              $scope.goToReturnUrl();
            } else {
              $location.url('/texts/' + data.text_no);
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
          function(text) {
            $log.log("ShowTextCtrl - getText(" + textNo + ") - success");
            $scope.textIsLoading = false;
            $scope.text = text;
            angular.element($window).scrollTop(1);
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
    '$scope', '$log',
    'messagesService', 'marksService',
    function($scope, $log,
             messagesService, marksService) {
      $scope.marks = null;
      $scope.currentMark = null;
      
      function update() {
        $scope.currentMark = false;
        if ($scope.marks != null && $scope.text != null && $scope.text.text_no != null) {
          $scope.currentMark = _.find($scope.marks, function(m) {
            return m.text_no === $scope.text.text_no;
          });
        }
      }
      
      marksService.getMarks($scope.connection).then(
        function(marks) {
          $scope.marks = marks
        },
        function(response) {
          messagesService.showMessage('error', 'Failed to get marked texts.', response.data);
        });
      
      $scope.$watch('text.text_no', function(newTextNo) {
        update();
      });
      
      $scope.$watch('marks', function(newMarks) {
        update();
      }, true);
    }
  ]).
  controller('TextControlsCtrl', [
    '$scope', '$log', '$window', '$location',
    'httpkomServer', 'keybindingService', 'readMarkingsService', 'textsService', 'marksService',
    'messagesService',
    function($scope, $log, $window, $location,
             httpkomServer, keybindingService, readMarkingsService, textsService, marksService,
             messagesService) {
      $scope.readmarkIsLoading = false;
      $scope.markIsLoading = false;
      
      $scope.writeComment = function() {
        var returnUrl = $location.url();
        $location.url("/texts/new");
        $location.search({ returnUrl: returnUrl,
                           commentTo: $scope.text.text_no });
      };
      
      keybindingService.bindPageSpecific('k', 'Write comment', function(e) {
        $scope.$apply(function() {
          $scope.writeComment();
        });
        return false;
      });
      
      $scope.markAsRead = function() {
        var text = $scope.text;
        $scope.readmarkIsLoading = true;
        readMarkingsService.createGlobalReadMarking($scope.connection, text).then(
          function() {
            $log.log("TextControlsCtrl - markAsRead(" + text.text_no + ") - success");
            $scope.readmarkIsLoading = false;
            text._is_unread = false;
          },
          function(response) {
            $log.log("TextControlsCtrl - markAsRead(" + text.text_no + ") - error");
            $scope.readmarkIsLoading = false;
            messagesService.showMessage(
              'error', 'Failed to mark text ' + text.text_no + ' as read.', response.data);
          });
      };
      
      $scope.markAsUnread = function() {
        var text = $scope.text;
        $scope.readmarkIsLoading = false;
        readMarkingsService.deleteGlobalReadMarking($scope.connection, text).then(
          function() {
            $log.log("TextControlsCtrl - markAsUnread(" + text.text_no + ") - success");
            $scope.readmarkIsLoading = false;
            text._is_unread = true;
          },
          function(response) {
            $log.log("TextControlsCtrl - markAsUnread(" + text.text_no + ") - error");
            $scope.readmarkIsLoading = false;
            messagesService.showMessage(
              'error', 'Failed to mark text ' + text.text_no + ' as read.', response.data);
          });
      };
      
      
      $scope.markTextFormIsVisible = false;
      $scope.showMarkTextForm = function() {
        $scope.markTextFormIsVisible = true;
      };
      $scope.hideMarkTextForm = function() {
        $scope.markTextFormIsVisible = false;
      };
      
      keybindingService.bindPageSpecific('M', 'Mark text', function(e) {
        $scope.$apply(function() {
          if ($scope.markTextFormIsVisible) {
            $scope.hideMarkTextForm();
          } else {
            $scope.showMarkTextForm();
          }
        });
        return false;
      });
      
      $scope.$watch('text.text_no', function() {
        $scope.hideMarkTextForm();
      });
    }
  ]).
  controller('UnmarkTextCtrl', [
    '$scope', '$log',
    'marksService', 'messagesService',
    function($scope, $log, marksService, messagesService) {
      $scope.isUnmarking = false;
      
      var unmarkText = function(textNo) {
        $scope.isUnmarking = true;
        marksService.deleteMark($scope.connection, textNo).then(
          function() {
            $log.log("UnmarkTextCtrl - markText(" + textNo + ") - success");
            $scope.isUnmarking = false;
          },
          function(response) {
            $log.log("UnmarkTextCtrl - markText(" + textNo + ") - error");
            $scope.isUnmarking = false;
            if (response.data.error_code === 44) {
              messagesService.showMessage(
                '', 'The text ' + response.data.error_status + ' was not marked.');
            } else {
              messagesService.showMessage('error', 'Failed to unmark text.', response.data);
            }
          });
      };
      
      $scope.unmarkText = function() {
        unmarkText($scope.text.text_no);
      };
    }
  ]).
  controller('MarkTextCtrl', [
    '$scope', '$log',
    'marksService', 'messagesService',
    function($scope, $log, marksService, messagesService) {
      $scope.markType = 0;
      $scope.isMarking = false;
      
      var markText = function(textNo, markType) {
        $scope.isMarking = true;
        marksService.createMark($scope.connection, textNo, markType).then(
          function() {
            $log.log("MarkTextCtrl - markText(" + textNo + ", " + markType + ") - success");
            $scope.isMarking = false;
            $scope.hideMarkTextForm();
          },
          function(response) {
            $log.log("MarkTextCtrl - markText(" + textNo + ", " + markType + ") - error");
            $scope.isMarking = false;
            // TODO: How will it work on mobile when we don't hide on
            // error? Will the error message fit?
            messagesService.showMessage(
              'error', 'Failed to mark text ' + textNo + '.', response.data);
          });
      };
      
      $scope.markText = function() {
        markText($scope.text.text_no, $scope.markType);
      };
    }
  ]).
  controller('ListMarksCtrl', [
    '$scope', '$log',
    'marksService', 'messagesService', 'pageTitleService',
    function($scope, $log, marksService, messagesService, pageTitleService) {
      pageTitleService.set("Marked texts");
      
      $scope.marks = null;
      $scope.isLoading = false;
      $scope.pageSize = 10;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;
      
      var getMarks = function() {
        $scope.isLoading = true;
        marksService.getMarks($scope.connection).then(
          function(marks) {
            $log.log("ListMarksCtrl - getMarks() - success");
            $scope.isLoading = false;
            $scope.marks = _.sortBy(marks, function(mark) { return mark.type; });
            
            $scope.currentPage = 0;
            $scope.numberOfPages = Math.ceil($scope.marks.length / $scope.pageSize);
          },
          function(response) {
            $log.log("ListMarksCtrl - getMarks() - error");
            $scope.isLoading = false;
            messagesService.showMessage('error', 'Failed to get text marks.', response.data);
        });
      };
      getMarks();
      
      $scope.refresh = function() {
        if (!$scope.isLoading) {
          getMarks();
        }
      };
      
      $scope.previousPage = function() {
        $scope.currentPage = ($scope.currentPage < 1 ? 0 : $scope.currentPage - 1);
      };
      $scope.nextPage = function() {
        $scope.currentPage = ($scope.currentPage >= $scope.numberOfPages -1 ?
                              $scope.currentPage : $scope.currentPage + 1);
      };
    }
  ]).
  controller('ListConfTextsCtrl', [
    '$scope', '$log', '$routeParams', '$location',
    'pageTitleService', 'conferencesService', 'textsService', 'keybindingService',
    function($scope, $log, $routeParams, $location,
             pageTitleService, conferencesService, textsService, keybindingService) {
      $scope.confNo = $routeParams.confNo;
      pageTitleService.set("Last texts in conference: " + $scope.confNo);
      
      $scope.texts = null;
      $scope.isLoading = true;
      textsService.getLastCreatedTextsInConference($scope.connection, $scope.confNo).then(
        function (texts) {
          $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - success");
          $scope.isLoading = false;
          $scope.texts = texts;
          $scope.texts.reverse();
        },
        function (response) {
          $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - error");
          $scope.isLoading = false;
        });
      
      keybindingService.bindPageSpecific('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          if ($scope.confNo != null) {
            $location.url("/conferences/" + $scope.confNo + "/set-unread");
          }
        });
        return false;
      });
    }
  ]).
  controller('ListConfsCtrl', [
    '$scope', '$log', 'pageTitleService', 'conferencesService',
    function($scope, $log, pageTitleService, conferencesService) {
      pageTitleService.set("List conferences");
      
      $scope.lookupName = "";
      $scope.confs = null;
      $scope.isLoading = false;
      $scope.pageSize = 10;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;
      
      $scope.listConfs = function() {
        $scope.isLoading = true;
        conferencesService.lookupConferences(
          $scope.connection, $scope.lookupName, false, true).then(
            function(conferences) {
              $log.log("ListConfsCtrl - listConfs() - success")
              $scope.isLoading = false;
              
              $scope.confs = _.sortBy(conferences, function(conf) {
                return conf.conf_name;
              });
              $scope.currentPage = 0;
              $scope.numberOfPages = Math.ceil($scope.confs.length / $scope.pageSize);
            },
            function(response) {
              $log.log("ListConfsCtrl - listConfs() - error")
              $scope.isLoading = false;
              messagesService.showMessage('error', 'Failed to list conferences.', response.data);
            });
      };
      
      $scope.previousPage = function() {
        $scope.currentPage = ($scope.currentPage < 1 ? 0 : $scope.currentPage - 1);
      };
      $scope.nextPage = function() {
        $scope.currentPage = ($scope.currentPage >= $scope.numberOfPages -1 ?
                              $scope.currentPage : $scope.currentPage + 1);
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
    'membershipsService', 'textsService',
    function($scope, $routeParams, $log, $location,
             pageTitleService, conferencesService, keybindingService, messagesService,
             membershipsService, textsService) {
      $scope.conf = null;
      $scope.isLoadingMembership = false;
      $scope.isLoadingPresentation = false;
      $scope.text = null;
      $scope.isJoining = false;
      $scope.isLeaving = false;
      $scope.membership = null;
      

      $scope.activeTab = 'presentation';
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

      var getMembership = function(confNo) {
        $scope.isLoadingMembership = true;
        $scope.membership = null;
        return membershipsService.getMembership($scope.connection, confNo).then(
            function(membership) {
              $log.log("ShowConfCtrl - getMembership(" + confNo + ") - success");
              $scope.isLoadingMembership = false;
              $scope.membership = membership;
              return membership;
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
      
      var getPresentation = function(textNo) {
        $scope.isLoadingPresentation = true;
        textsService.getText($scope.connection, textNo).then(
          function(text) {
            $log.log("ShowConfCtrl - getPresentation(" + textNo + ") - success");
            $scope.isLoadingPresentation = false;
            $scope.text = text;
          },
          function(response) {
            $log.log("ShowConfCtrl - getPresentation(" + textNo + ") - error");
            $scope.isLoadingPresentation = false;
            $scope.text = null;
            messagesService.showMessage('error', 'Failed to get presentation.', response.data);
          });
      };
      
      $scope.joinConf = function() {
        var confNo = $scope.conf.conf_no;
        $scope.isJoining = true;
        membershipsService.addMembership($scope.connection, confNo).then(
          function() {
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
          function() {
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
        function(conference) {
          $log.log("ShowConfCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = conference;
          getMembership($scope.conf.conf_no).then(
            function() {
              if ($scope.conf.presentation !== 0) {
                getPresentation($scope.conf.presentation);
              }
            });
          pageTitleService.set($scope.conf.name);
        },
        function(response) {
          $log.log("ShowConfCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', response.data);
          pageTitleService.set("");
        });
      
      keybindingService.bindPageSpecific('e', 'Set unread...', function(e) {
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
    'messagesService', 'textsService', 'pageTitleService', 'keybindingService', 'readerFactory',
    'sessionsService', 'membershipListService',
    function($scope, $rootScope, $routeParams, $log, $window, $location,
             messagesService, textsService, pageTitleService, keybindingService, readerFactory,
             sessionsService, membershipListService) {
      $scope.textIsLoading = false;
      $scope.text = null;
      
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
            
            angular.element($window).scrollTop(1);
          },
          function(response) {
            $scope.textIsLoading = false;
            messagesService.showMessage('error', 'Failed to get text.', response.data);
          });
      };
      
      var showText = function(textNo) {
        if (textNo) {
          setText(textsService.getText($scope.connection, textNo));
        }
      };
      
      $rootScope.$on('$routeUpdate', function(event) {
        showText(parseInt($routeParams.text));
        // We manually clear messages. It is done on route change, but
        // we don't want to trigger route change on changing text
        // parameter, so we need to clear messages ourself here.
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
      
      $scope.readNext = function() {
        if (!$scope.textIsLoading) {
          if ($scope.reader.isEmpty()) {
            $location.url('/');
          } else {
            setText($scope.reader.shift());
          }
        }
      };
      
      $scope.confNo = parseInt($routeParams.confNo);
      
      $scope.membershipList = null;
      $scope.isLoadingMembershipList = false;
      var getMembershipList = function () {
        membershipListService.getMembershipList($scope.connection).then(
          function (membershipList) {
            $log.log("ReaderCtrl - getMembershipList() - success");
            $scope.isLoadingMembershipList = false;
            $scope.membershipList = membershipList;
          },
          function () {
            $log.log("ReaderCtrl - getMembershipList() - error");
            $scope.isLoadingMembershipList = false;
            $scope.membershipList = null;
            // TODO: Better error handling.
            
            // What if we're not a member? Ideally we will only go to
            // conferences that we have unread in and then there's no
            // problem, but I think we should handle conferences that
            // we're not a member how. Right now
            // membershipList.getMembership(..) will return
            // undefined/null and nothing more will happen.
            
            messagesService.showMessage('error', 'Failed to get membership list.');
          });
      };
      
      var getMembership = function (scope) {
        if (scope.membershipList != null) {
          return scope.membershipList.getMembership(scope.confNo);
        } else {
          return null;
        }
      };
      
      $scope.membership = null;
      $scope.reader = null;
      $scope.$watch(getMembership, function (newMembership) {
        $scope.membership = newMembership;
        if (newMembership != null) {
          // TODO: Because we only initialize the reader once, we
          // won't update the unread text list until we re-create the
          // scope (reload page or so).
          // 
          // Option 1: We want to refactor the reader/unreadqueue so
          // it can return the next text to read given a list of
          // unread texts, instead of being an object. That way we
          // could always call it with the list of unread texts in the
          // membership and get the correct next unread. Would that
          // work when following a thread (we want to follow a thread
          // until it ends).
          // 
          // Option 2: Not sure how option 1 would work with
          // threads. An alternative is to make the reader/unreadqueue
          // watch the broadcast events for new readmarks/unmarks and
          // everything else that changes the unread texts (not sure
          // there are enough events for it right now, but we could
          // add).
          var unreadQueue = readerFactory.createUnreadQueue(
            $scope.connection, newMembership.unread_texts);
          var reader = readerFactory.createReader($scope.connection, unreadQueue);
          
          if ($routeParams.text) {
            reader.unshiftPending($routeParams.text);
          }
          if (!reader.isEmpty()) {
            setText(reader.shift());
          }
          
          // If we got a membership, we know we are a member of the
          // conference and can change the working conference to it.
          sessionsService.changeConference($scope.connection, $scope.confNo);
          
          $scope.reader = reader;
        } else {
          $scope.reader = null;
        }
      });
      
      $scope.$watch('membership.no_of_unread', function (newUnreadCount) {
        if (newUnreadCount != null) {
          newUnreadCount = newUnreadCount == 0 ? "No" : newUnreadCount;
          var confName = $scope.membership.conference.conf_name;
          pageTitleService.set(newUnreadCount + " unread in " + confName);
        } else {
          pageTitleService.set("");
        }
      }, true);
      
      getMembershipList();
      
      
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
      
      keybindingService.bindPageSpecific([','/*, 'å k'*/], 'Show commented', function() {
        //$log.log("å k");
        $scope.$apply(function() {
          $scope.showCommented();
        });
        return false;
      });
      
      /*keybindingService.bindPageSpecific('å a k', 'Show all comments', function() {
        $log.log("å a k");
        $scope.$apply(function() {
          $scope.showAllComments();
        });
        return false;
      });*/
      
      keybindingService.bindPageSpecific('space', 'Read next unread text', function(e) {
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
      
      keybindingService.bindPageSpecific('e', 'Set unread...', function(e) {
        $scope.$apply(function() {
          if ($scope.confNo != null) {
            $location.url("/conferences/" + $scope.confNo + "/set-unread");
          }
        });
        return false;
      });
    }
  ]);
