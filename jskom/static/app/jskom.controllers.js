// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.controllers', ['jskom.httpkom', 'jskom.services', 'jskom.settings',
                                     'jskom.keybindings']).
  controller('HelpCtrl', [
    '$scope', '$log', 'keybindingService',
    function($scope, $log, keybindingService) {
      $scope.$watch(keybindingService.getGeneralBindings, function(newGeneralBindings) {
        $scope.generalKeys = newGeneralBindings;
      });
    }
  ]).
  controller('KeybindingHelpCtrl', [
    '$scope', '$log', 'keybindingService', 'modernizr',
    function($scope, $log, keybindingService, modernizr) {
      $scope.isVisible = false;
      $scope.hasTouch = modernizr.touch;
      
      keybindingService.bindGeneral('?', 'Show page specific keybindings (toggle)', function(e) {
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
  controller('SidebarCtrl', [
    '$scope', '$log', '$routeParams',
    'messagesService', 'keybindingService', 'membershipListService',
    function($scope, $log, $routeParams,
             messagesService, keybindingService, membershipListService) {
      $scope.membershipList = null;
      $scope.readMemberships = null;
      $scope.unreadMemberships = null;
      $scope.currentConfNo = null;
      
      $scope.$watch(function() { return $routeParams.confNo; }, function(newConfNo) {
        $scope.currentConfNo = newConfNo;
      }, true);
      
      $scope.$watch('connection', function (newConnection) {
        $scope.membershipList = null;
        $scope.readMemberships = null;
        $scope.unreadMemberships = null;
        
        if (newConnection != null) {
          membershipListService.getMembershipList($scope.connection).then(
            function (membershipList) {
              $log.log("SidebarCtrl - getMembershipList() - success");
              $scope.membershipList = membershipList;
            },
            function () {
              $log.log("SidebarCtrl - getMembershipList() - error");
              $scope.membershipList = null;
            });
        }
      });
      
      $scope.pageSize = 20;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;
      
      $scope.$watch('membershipList.getReadMemberships()', function (newReadMemberships) {
        //$log.log("SidebarCtrl - watch(membershipList.getReadMemberships())");
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
        //$log.log("SidebarCtrl - watch(membershipList.getUnreadMemberships())");
        //$log.log(newUnreadMemberships);
        $scope.unreadMemberships = newUnreadMemberships;
      });
      
      $scope.isRefreshing = false;
      $scope.refreshUnread = function() {
        if ($scope.membershipList != null && !$scope.isRefreshing) {
          $scope.isRefreshing = true;
          $scope.connection.userIsActive();
          membershipListService.refreshUnread($scope.connection).then(
            function () { $scope.isRefreshing = false; },
            function () { $scope.isRefreshing = false; });
        }
      };
      
      keybindingService.bindGeneral('R', 'Refresh unread texts', function(e) {
        $scope.$apply(function() {
          $scope.refreshUnread();
        });
        return false;
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
            $location.url('/');
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
          var m = _.first(_.sortBy($scope.unreadMemberships, function (m) {
            return -m.priority;
          }));
          $location.url("/conferences/" + m.conference.conf_no + "/texts/unread/");
        }
      };
      
      keybindingService.bindPageSpecific('space', 'Read first conference', function(e) {
        if ($scope.unreadMemberships.length > 0) {
          $scope.$apply(function() {
            $scope.readFirstConference();
          });
        }
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
    '$scope', 'textsService', '$log', '$location', '$routeParams',
    'messagesService', 'pageTitleService', 'keybindingService',
    function($scope, textsService, $log, $location, $routeParams,
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
        if ($routeParams.confNo != null) {
          newText.recipient_list.push(
            { "type": "to", "recpt": { "conf_no": $routeParams.confNo } });
        } else {
          newText.recipient_list.push($scope.newRecipient());
        }
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
      $scope.pageNumbers = [0];
      
      $scope.currentPageClass = function (pageNumber) {
        if (pageNumber == $scope.currentPage) {
          return "current";
        } else {
          return "";
        }
      };
      
      $scope.showPage = function (pageNumber) {
        $scope.currentPage = pageNumber;
      };
      
      var getMarks = function() {
        $scope.isLoading = true;
        marksService.getMarks($scope.connection).then(
          function(marks) {
            $log.log("ListMarksCtrl - getMarks() - success");
            $scope.isLoading = false;
            $scope.marks = _.sortBy(marks, function(mark) { return mark.type; });
            
            $scope.currentPage = 0;
            $scope.numberOfPages = Math.ceil($scope.marks.length / $scope.pageSize);
            $scope.pageNumbers = _.range($scope.numberOfPages);
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
  controller('ListConfTextsCtrl', [
    '$scope', '$routeParams', '$log', '$location',
    'pageTitleService', 'conferencesService', 'messagesService', 'textsService',
    'keybindingService',
    function($scope, $routeParams, $log, $location,
             pageTitleService, conferencesService, messagesService, textsService,
             keybindingService) {
      $scope.conf = null;
      $scope.isLoadingTexts = false;
      $scope.texts = null;
      
      var getLastTexts = function (confNo) {
        $scope.isLoadingTexts = true;
        textsService.getLastCreatedTextsInConference($scope.connection, confNo).then(
          function (texts) {
            $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - success");
            $scope.isLoadingTexts = false;
            $scope.texts = texts;
            $scope.texts.reverse();
          },
          function (response) {
            $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - error");
            $scope.isLoadingTexts = false;
          });
      };
      
      conferencesService.getConference($scope.connection, $routeParams.confNo).then(
        function(conference) {
          $log.log("ListConfTextsCtrl - getConference(" + $routeParams.confNo + ") - success");
          $scope.conf = conference;
          pageTitleService.set("Last texts in " + $scope.conf.name);
          getLastTexts($scope.conf.conf_no);
        },
        function(response) {
          $log.log("ListConfTextsCtrl - getConference(" + $routeParams.confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', response.data);
          pageTitleService.set("");
        });
      
      keybindingService.bindPageSpecific('space', 'Read conference', function(e) {
        if ($scope.conf != null) {
          $scope.$apply(function() {
            $location.path('/conferences/' + parseInt($scope.conf.conf_no) + "/texts/unread/");
          });
        }
        return false;
      });

    }
  ]).
  controller('ShowConfCtrl', [
    '$scope', '$routeParams', '$log', '$location',
    'pageTitleService', 'conferencesService', 'messagesService', 'membershipsService',
    'textsService',
    function($scope, $routeParams, $log, $location,
             pageTitleService, conferencesService, messagesService, membershipsService,
             textsService) {
      $scope.isLoadingMembership = false;
      $scope.isLoadingPresentation = false;
      $scope.text = null; // presentation
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
      
      conferencesService.getConference($scope.connection, $routeParams.confNo).then(
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
    }
  ]).
  controller('UnreadTextsCtrl', [
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location', '$q',
    'messagesService', 'textsService', 'pageTitleService', 'keybindingService', 'readerFactory',
    'sessionsService', 'membershipListService', 'readMarkingsService',
    function($scope, $rootScope, $routeParams, $log, $window, $location, $q,
             messagesService, textsService, pageTitleService, keybindingService, readerFactory,
             sessionsService, membershipListService, readMarkingsService) {
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
      
      function setText(textPromise) {
        $scope.connection.userIsActive();
        
        $scope.textIsLoading = true;
        angular.element($window).scrollTop(1);
        return textPromise.then(
          function(text) {
            $scope.textIsLoading = false;
            $scope.text = text;
            
            if ($location.search().text != text.text_no) {
              if ($location.search().text == null) {
                $location.replace();
              }
              $location.search('text', text.text_no);
            }
            
            return text;
          },
          function(response) {
            $scope.textIsLoading = false;
            messagesService.showMessage('error', 'Failed to get text.', response.data);
            $q.reject(response);
          });
      }
      
      function showText(textNo) {
        return setText(textsService.getText($scope.connection, textNo));
      }
      
      function markAsRead(text) {
        // This is a bit of a hack (for performance reasons).
        // 
        // To speed up read-marking in the UI we broadcast the
        // readMarking:created event *before* we send the response,
        // and then broadcast the readMarking:deleted if the request
        // fails.
        // 
        // But we also broadcast the readMarking:created when the
        // request has finished to handle the following corner case:
        // 
        // Read marking {text:17}
        // ----------------------
        // t1: event(readMarking:created) => unread texts -= {text:17}
        // t2: read marking request starts
        // t3: [ elsewhere: get unread request finishes => unread texts += {text:17} ]
        // t4: read marking request finishes
        // 
        // Now {text:17} is marked as read on the server, but we have it as unread.
        // 
        // So we introduce t5:
        // t5: event(readMarking:created) => unread texts -= {text:17}
        // 
        // and then we will have the correct state.
        // 
        // This assumes that the handling of the readMarking:created
        // event is idempotent. It's a reasonable assumption to
        // make, because read-marking uses HTTP PUT.
        $scope.connection.broadcast('jskom:readMarking:created', text);
        readMarkingsService.createGlobalReadMarking($scope.connection, text).then(
          function() {
            $log.log("UnreadTextsCtrl - markAsRead(" + text.text_no + ") - success");
            text._is_unread = false;
          },
          function(response) {
            $log.log("UnreadTextsCtrl - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', response.data);
            $scope.connection.broadcast('jskom:readMarking:deleted', text);
          });
      }
      
      function hasUnread() {
        return $scope.membership.no_of_unread > 0;
      }
      
      function isEmpty() {
        // TODO: rename function
        return (!$scope.reader.hasPending() && !hasUnread());
      }
      
      function showNextText() {
        // This function shouldn't do anything if we don't have any
        // pending or unread texts.
        
        if ($scope.reader.hasPending()) {
          showText($scope.reader.shiftPending());
        } else if (hasUnread()) {
          // set is loading here because we're waiting on a text
          // before we get the text number.
          $scope.textIsLoading = true;
          $scope.reader.shiftUnread($scope.membership.unread_texts).then(function (textNo) {
            showText(textNo).then(function(text) {
              text._is_unread = true;
              markAsRead(text);
            });
          });
        }
      }
      
      $rootScope.$on('$routeUpdate', function(event) {
        // We manually clear messages. It is done on route change, but
        // we don't want to trigger route change on changing text
        // parameter, so we need to clear messages ourself here.
        messagesService.clearAll(true);
        showText(parseInt($routeParams.text));
      });
      
      $scope.$on('jskom:a:text', function($event, textNo, href) {
        // When clicking on text links in the reader, we just show the
        // text inside the reader, instead of going to the "show text"
        // page.
        //$log.log("UnreadTextsCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        showText(textNo);
      });
      
      $scope.readNext = function() {
        if (!$scope.textIsLoading) {
          if (!isEmpty()) {
            showNextText();
          } else {
            $location.url('/');
          }
        }
      };
      
      function getMembership(scope) {
        if (scope.membershipList != null) {
          return scope.membershipList.getMembership(scope.confNo);
        } else {
          return null;
        }
      }
      
      $scope.confNo = parseInt($routeParams.confNo);
      
      $scope.reader = readerFactory.createReader($scope.connection);
      if ($routeParams.text) {
        // If we have a text number in the route parameters, add
        // it to the reader.
        $scope.reader.unshiftPending($routeParams.text);
      }
      
      $scope.membership = null;
      $scope.membershipList = null;
      $scope.isLoadingMembership = true;
      membershipListService.getMembershipList($scope.connection).then(
        function (membershipList) {
          $log.log("UnreadTextsCtrl - getMembershipList() - success");
          $scope.membershipList = membershipList;
          
          $scope.membership = $scope.membershipList.getMembership($scope.confNo);
          if ($scope.membership != null
              && $scope.connection.currentConferenceNo !== $scope.confNo) {
              sessionsService.changeConference($scope.connection, $scope.confNo);
          }
          // TODO: if we get null, try to fetch the membership from
          // the server, because membershiplist might not be loaded!
          // (That also means that we probably want to move
          // changeConference to the $watch of getMembership().
          
          showNextText();
          
          $scope.isLoadingMembership = false;
        },
        function () {
          $log.log("UnreadTextsCtrl - getMembershipList() - error");
          $scope.isLoadingMembership = false;
          messagesService.showMessage('error', 'Failed to get membership list.');
        });
      
      
      $scope.$watch(getMembership, function (newMembership) {
        // We $watch the membership because the MembershipList can
        // return a different object after it has been updated.
        $scope.membership = newMembership;
      });
      
      $scope.$watch('membership.no_of_unread', function (newUnreadCount) {
        if (newUnreadCount != null) {
          newUnreadCount = newUnreadCount == 0 ? "No" : newUnreadCount;
          var confName = $scope.membership.conference.conf_name;
          pageTitleService.set(newUnreadCount + " unread in " + confName);
        } else {
          pageTitleService.set("");
        }
      });
      
      
      $scope.showCommented = function() {
        $log.log('UnreadTextsCtrl - showCommented()');
        if ($scope.text && !_.isEmpty($scope.text.comment_to_list)) {
          $scope.reader.unshiftPending.apply(
            $scope.reader,
            _.map($scope.text.comment_to_list, function(ct) {
              return ct.text_no;
            }));
          
          showNextText();
        }
      };
      
      $scope.showAllComments = function() {
        $log.log('UnreadTextsCtrl - showAllComments()');
        if ($scope.text && !_.isEmpty($scope.text.comment_in_list)) {
          $scope.reader.unshiftPending.apply(
            $scope.reader,
            _.map($scope.text.comment_in_list, function(ci) {
              return ci.text_no;
            }));
          
          showNextText();
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
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location',
    'messagesService', 'textsService', 'pageTitleService', 'keybindingService', 'readerFactory',
    'sessionsService', 'membershipListService',
    function($scope, $rootScope, $routeParams, $log, $window, $location,
             messagesService, textsService, pageTitleService, keybindingService, readerFactory,
             sessionsService, membershipListService) {
      
    }    
  ]);
