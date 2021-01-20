// Copyright (C) 2012-2017 Oskar Skoog.

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
  controller('MembershipsCtrl', [
    '$scope', '$log', '$routeParams',
    'messagesService', 'keybindingService', 'membershipListService',
    function($scope, $log, $routeParams,
             messagesService, keybindingService, membershipListService) {
      $scope.membershipList = null;
      
      $scope.$watch('connection', function (newConnection) {
        $scope.membershipList = null;
        
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
        }
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
  controller('SidebarCtrl', [
    '$scope', '$log', '$routeParams', 'messagesService',
    function($scope, $log, $routeParams, messagesService) {
      $scope.currentConfNo = null;
      
      $scope.$watch(function() { return $routeParams.confNo; }, function(newConfNo) {
        $scope.currentConfNo = newConfNo;
      }, true);
      
      $scope.pageSize = 20;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;
      
      $scope.previousPage = function() {
        $scope.currentPage = ($scope.currentPage < 1 ? 0 : $scope.currentPage - 1);
      };
      $scope.nextPage = function() {
        $scope.currentPage = ($scope.currentPage >= $scope.numberOfPages -1 ?
                              $scope.currentPage : $scope.currentPage + 1);
      };
      
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
      
      $scope.$watch('membershipList.getUnreadMemberships()', function (newUnreadMemberships) {
        //$log.log("SidebarCtrl - watch(membershipList.getUnreadMemberships())");
        //$log.log(newUnreadMemberships);
        $scope.unreadMemberships = newUnreadMemberships;
      });
    }
  ]).
  controller('ConnectionsCtrl', [
    '$scope', '$rootScope', '$log', '$location',
    'connectionsService', 'httpkom', 'messagesService', 'sessionsService', 'keybindingService',
    function($scope, $rootScope, $log, $location,
             connectionsService, httpkom, messagesService, sessionsService, keybindingService) {
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
    function($scope, $location, $log,
             conferencesService, pageTitleService, messagesService, keybindingService) {
      pageTitleService.set("Unread conferences");
      
      $scope.unreadMemberships = null;
      
      $scope.$watch('membershipList.getUnreadMemberships()', function (newUnreadMemberships) {
        //$log.log("UnreadConfsCtrl - watch(membershipList.getUnreadMemberships())");
        $scope.unreadMemberships = newUnreadMemberships;
      });
      
      $scope.$watch('unreadMemberships', function(newUnreadMemberships) {
        if (newUnreadMemberships != null) {
          var unreadCount = _.reduce(newUnreadMemberships, function(count, membership) {
            return count + membership.no_of_unread;
          }, 0);
          pageTitleService.set("(" + unreadCount + ") Unread conferences");
        }
      });
      
      $scope.readFirstConference = function() {
        if ($scope.unreadMemberships.length > 0) {
          var m = _.first(_.sortBy($scope.unreadMemberships, function (m) {
            return -m.priority;
          }));
          $location.url("/conferences/" + m.conference.conf_no + "/texts/");
        }
      };
      
      keybindingService.bindPageSpecific(['space', 'j'], 'Read first conference', function(e) {
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
    'messagesService', 'pageTitleService', 'keybindingService', 'imageService',
    function($scope, textsService, $log, $location, $routeParams,
             messagesService, pageTitleService, keybindingService, imageService) {
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
          content_encoding: null,
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


      $scope.activeContentTypeTab = 'text'; // text or image

      $scope.selectContentTypeTab = function(tab) {
        $scope.activeContentTypeTab = tab;
      };

      $scope.isContentTypeTabActive = function(tab) {
        if ($scope.activeContentTypeTab == tab) {
          return 'active';
        } else {
          return '';
        }
      };

      var maxImageSize = 600;
      // can't use text.body in img ng-src, because it's updated when typing in the textarea,
      // so therefor we have a imageDataUrl which we update only when we have a complete image.
      $scope.imageDataUrl = null;
      $scope.imageIsLoading = false;
      $scope.loadImage = function(files) {
        var file = files[0];
        if (file) {
          $scope.text.content_type = null;
          //console.log(file);
          // TODO:
          // * Use file.name in content type: name=<name>?
          // * Use file.size to decide if we need to resize it?
          // * Use EXIF info to rotate JPEGs?
          var imageReader  = new FileReader();
          imageReader.addEventListener("load", function () {
            imageService.resizeImage(imageReader.result, maxImageSize, maxImageSize).then(function (scaledDataUrl) {
              $scope.imageIsLoading = false;
              $scope.imageDataUrl = scaledDataUrl;
              $scope.text.content_type = scaledDataUrl.replace(/^data:(.*);base64,(.*)$/, "$1");
              $scope.text.body = scaledDataUrl.replace(/^data:(.*);base64,(.*)$/, "$2");
              $scope.text.content_encoding = "base64";
            });
          }, false);
          imageReader.readAsDataURL(file);
          $scope.$apply(function() {
            $scope.imageIsLoading = true;
          });
        }
      };


      $scope.createText = function() {
        if ($scope.isCreating) {
          return;
        }

        $scope.isCreating = true;
        textsService.createText($scope.connection, $scope.text).then(
          function(data) {
            $log.log("NewTextCtrl - createText() - success");
            messagesService.showMessage('success', 'Successfully created text.',
                                        'Text number ' + data.text_no + ' was created.',
                                        true);
            if ($scope.returnUrl) {
              $scope.goToReturnUrl();
            } else {
              $location.url('/texts/?text=' + data.text_no);
            }
            $scope.isCreating = false;
          },
          function(response) {
            $log.log("NewTextCtrl - createText() - error");
            messagesService.showMessage('error', 'Failed to create text.', response.data);
            $scope.isCreating = false;
          });
      };
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
      $scope.markType = 100;
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
                return conf.name;
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
  controller('GoToTextCtrl', [
    '$scope', '$location', '$log', 'pageTitleService',
    function($scope, $location, $log, pageTitleService) {
      pageTitleService.set("Go to text");

      $scope.textNo = null;
      $scope.goToText = function() {
        if ($scope.textNo) {
          $location.url('/texts/?text=' + parseInt($scope.textNo));
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
      function getLastTexts(confNo) {
        $scope.isLoadingTexts = true;
        textsService.getLastCreatedTextsInConference($scope.connection, confNo).then(
          function (texts) {
            $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - success");
            $scope.isLoadingTexts = false;
            $scope.texts = texts;

            $scope.currentPage = 0;
            $scope.numberOfPages = Math.ceil($scope.texts.length / $scope.pageSize);
          },
          function (response) {
            $log.log("ListConfTextsCtrl - getLastCreatedTextsInConference() - error");
            $scope.isLoadingTexts = false;
          });
      }
      
      function getConference(confNo) {
        pageTitleService.set("");
        conferencesService.getConference($scope.connection, confNo).then(
          function(conference) {
            $log.log("ListConfTextsCtrl - getConference(" + confNo + ") - success");
            $scope.conf = conference;
            pageTitleService.set("Last texts in " + $scope.conf.name);
            getLastTexts($scope.conf.conf_no);
          },
          function(response) {
            $log.log("ListConfTextsCtrl - getConference(" + confNo + ") - error");
            messagesService.showMessage('error', 'Failed to get conference.', response.data);
          });
      }

      $scope.confNo = $routeParams.confNo;
      $scope.conf = null;
      $scope.isLoadingTexts = false;
      $scope.texts = null;
      $scope.membership = null;
      $scope.pageSize = 10;
      $scope.currentPage = 0;
      $scope.numberOfPages = 1;

      getConference($scope.confNo);
      
      $scope.$watch(
        function (scope) {
          return scope.membershipList.getMembership($scope.confNo);
        },
        function (newMembership) {
          $scope.membership = newMembership;
        });
      
      keybindingService.bindPageSpecific(['space', 'j'], 'Read conference', function(e) {
        if ($scope.conf != null) {
          $scope.$apply(function() {
            $location.path('/conferences/' + parseInt($scope.conf.conf_no) + "/texts/");
          });
        }
        return false;
      });

      $scope.previousPage = function() {
        $scope.currentPage = ($scope.currentPage < 1 ? 0 : $scope.currentPage - 1);
      };
      $scope.nextPage = function() {
        $scope.currentPage = ($scope.currentPage >= $scope.numberOfPages -1 ?
                              $scope.currentPage : $scope.currentPage + 1);
      };
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
  controller('ReadTextsCtrl', [
    '$scope', '$rootScope', '$routeParams', '$location', '$log', '$window',
    'readerFactory', 'textsService', 'messagesService', 'pageTitleService',
    function($scope, $rootScope, $routeParams, $location, $log, $window,
             readerFactory, textsService, messagesService, pageTitleService) {
      $scope.textNo = $location.search().text;
      $scope.reader = readerFactory.createReader($scope.connection);
      
      pageTitleService.set("Text " + $scope.textNo);
      $scope.$on('$routeUpdate', function($event) {
        $scope.textNo = $location.search().text;
        pageTitleService.set("Text " + $scope.textNo);
      });
      
      $scope.canReadNext = function () {
        return $scope.reader != null && $scope.reader.hasPending();
      };
      
      // Cannot read unread in ShowTextCtrl.
      $scope.preReadNextCheck = function () {
        if ($scope.reader.hasPending()) {
          return true;
        } else {
          return false;
        }
      };
    }
  ]).
  controller('ReadConferenceTextsCtrl', [
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location', '$q',
    'messagesService', 'textsService', 'pageTitleService', 'keybindingService', 'readerFactory',
    'sessionsService', 'membershipsService', 'conferencesService',
    function($scope, $rootScope, $routeParams, $log, $window, $location, $q,
             messagesService, textsService, pageTitleService, keybindingService, readerFactory,
             sessionsService, membershipsService, conferencesService) {
      function changeConference() {
        if ($scope.connection.currentConferenceNo !== $scope.confNo) {
          sessionsService.changeConference($scope.connection, $scope.confNo);
        }
      }
      
      function getConference(confNo) {
        conferencesService.getConference($scope.connection, confNo).then(
          function(conference) {
          $log.log("UnreadTextsCtrl - getConference(" + confNo + ") - success");
          $scope.conf = conference;
        },
        function(response) {
          // TODO: This can fail with the following message (in
          // browser) if any of the related conferences (not the one
          // being requested) is secret or deleted:
          //
          //   Failed to get conference.
          //   {"error_code":9,"error_msg":"UndefinedConference","error_status":"547","error_type":"protocol-a"}
          //
          // The error above is from reading "Butiker erfarenhetsutbyte" (möte 604).
          // The get-uconf-stat that fails is for the "created by" and "supermeeting".
          // The conferencesService.getConference() call will request generate
          // get-uconf-stat calls for all related meetings.
          //
          // This is how the meeting looks like in the elisp client:
          //
          //   Status för möte Butiker erfarenhetsutbyte (604)
          //
          //   Skapat av person                       547 (Person 547 (finns inte).)
          //   Skapad:                   1991-08-29 10:41
          //   Antal medlemmar:                       419
          //   Hemliga medlemmar:                       Hemliga medlemmar är inte tillåtna
          //   Anonyma inlägg:                          Anonyma inlägg är inte tillåtna
          //   Livslängd på inlägg:                    77 dagar
          //   Minsta livslängd för kommenterade inlägg: 0 dagar
          //   Lägsta existerande lokala nummer:       29
          //   Högsta existerande lokala nummer:    38690
          //   Tid för senaste inlägg:         idag 08:57 (står det i din cache)
          //   Lapp på dörren i text nummer:            0
          //   Supermöte:                             547 (Möte 547 (finns inte).)
          //   Tillåtna författare:                     0 (Alla)
          //   Organisatör:                          3343 (Magnus Bark (en rutten själ i en halvrund kropp))
          //   Presentation:                     10785008
          //   FAQ i inlägg:                      8359413 "Något om internationella postorderköp" [*]
          //   FAQ i inlägg:                      8326719 "Skribofont" [*]
          //   FAQ i inlägg:                     10176893 "sida typ bugsoft" [*]
          //   FAQ i inlägg:                     10179028 "Hämta ut paket MED avi minst en dag tidigare" [*]
          //
          //
          // See also:
          // https://www.lysator.liu.se/lyskom/protocol/11.1/protocol-a.html#get-uconf-stat
          //
          $log.log("UnreadTextsCtrl - getConference(" + confNo + ") - error");
          messagesService.showMessage('error', 'Failed to get conference.', response.data);
        });
      }
      
      function setPageTitle() {
        if ($scope.conf != null && $scope.reader != null) {
          pageTitleService.set("(" + $scope.reader.unreadCount() + ") " + $scope.conf.name);
        }
      }
      
      $scope.confNo = parseInt($routeParams.confNo);
      $scope.conf = null;
      getConference($scope.confNo);
      
      $scope.reader = readerFactory.createReader($scope.connection);
      
      if ($scope.membershipList.getMembership($scope.confNo) != null) {
        changeConference();
      }
      
      $scope.membership = null;
      $scope.$watch(
        function (scope) {
          return scope.membershipList.getMembership($scope.confNo);
        },
        function (newMembership, oldMembership) {
          if (newMembership != null) {
            $scope.membership = newMembership;
            $scope.reader.setMembership($scope.membership);
          }
        });
      
      pageTitleService.set("");
      $scope.$watch('conf', function () {
        setPageTitle();
      });
      $scope.$watch('reader.unreadCount()', function () {
        setPageTitle();
      });
      
      $scope.canReadNext = function () {
        if ($scope.membership == null) {
          return $scope.reader != null && $scope.reader.hasPending();
        } else {
          return $scope.reader != null;
        }
      };
      
      $scope.preReadNextCheck = function () {
        if ($scope.reader.isEmpty()) {
          $location.url('/');
          return false;
        } else {
          return true;
        }
      };
    }
  ]).
  controller('ReaderCtrl', [
    '$scope', '$rootScope', '$routeParams', '$log', '$window', '$location', '$q',
    'messagesService', 'textsService', 'keybindingService', 'readerFactory',
    'sessionsService', 'readMarkingsService',
    function($scope, $rootScope, $routeParams, $log, $window, $location, $q,
             messagesService, textsService, keybindingService, readerFactory,
             sessionsService, readMarkingsService) {
      function isScrolledIntoView(elem) {
        if (elem) {
          var docViewTop = angular.element($window).scrollTop();
          var docViewBottom = docViewTop + angular.element($window).height();
          
          var elemTop = angular.element(elem).offset().top;
          var elemBottom = elemTop + angular.element(elem).height();
          
          return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
        } else {
          return false;
        }
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
            //$log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - success");
          },
          function(response) {
            $log.log("ReaderCtrl - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', response.data);
            $scope.connection.broadcast('jskom:readMarking:deleted', text);
          });
      }
      
      function showText(textNo) {
        // show text
        
        $scope.connection.userIsActive();
        
        return $scope.showText(textNo).then(
          function(text) {
            // showText is called when the route is updated by the
            // browser history, so we must only update the location if
            // we have been told to show a different text number than
            // what is specified by the current url. Otherwise we
            // would end up in a loop.
            if ($location.search().text != text.text_no) {
              if ($location.search().text == null) {
                $location.replace();
              }
              $location.search('text', text.text_no);
            }
            return text;
          });
      }
      
      function readText(textNo) {
        // show text and mark it as read
        
        return showText(textNo).then(function (text) {
          // TODO: Check if text is unread before marking as read?
          markAsRead(text);
          return text;
        });
      }
      
      function showNextText() {
        // This function shouldn't do anything if we don't have any
        // pending or unread texts.
        
        $scope.readerTextIsLoading = false;
        if ($scope.reader.hasPending()) {
          showText($scope.reader.shiftPending());
        } else if ($scope.reader.hasUnread()) {
          // set is loading here because we're waiting on a text
          // before we get the text number.
          $scope.readerTextIsLoading = true;
          $scope.reader.shiftUnread().then(function (textNo) {
            readText(textNo).then(function (text) {
              $scope.readerTextIsLoading = false;
            });
          });
        }
      }
      
      $scope.$on('$routeUpdate', function(event) {
        // We manually clear messages. It is done on route change, but
        // we don't want to trigger route change on changing text
        // parameter, so we need to clear messages ourself here.
        //$log.log("ReaderCtrl - $routeUpdate - $routeparams.text: " + $routeParams.text);
        messagesService.clearAll(true);
        
        if (_.isUndefined($routeParams.text)) {
          // This happens when we are on the page with ?text=<nr>,
          // like "/conferences/8336/texts/?text=<nr>", and
          // click on a link to this page without text param, like
          // "/conferences/8336/texts/". Then the route will
          // change to that and $routeParams.text will be undefined,
          // and nothing more happens.  If it would cause a reload
          // (i.e. go through the route system) we wouldn't have to do
          // anything, but we need reloadOnSearch=false, so we need to
          // handle this case ourselfs.
          // 
          // It's possible that we could do $route.reload() instead,
          // but it would be hard to make sure that we don't end up in
          // an reload-loop.
          showNextText();
        } else {
          // Handle history changes. Back/forward will only update the
          // url, so we need to show the text specified by the
          // routeParams.
          // 
          // However, this will also be triggered when we change the
          // text programmatically (pressing buttons and such), so
          // it's important that showText() (called below) don't
          // update the $routeParams if the text number hasn't
          // changed, because then we would end up in a loop.
          showText($routeParams.text);
        }
      });
      
      $scope.$on('jskom:a:text', function($event, textNo, href) {
        // When clicking on text links in the reader, we just show the
        // text inside the reader, instead of going to the "show text"
        // page.
        //$log.log("UnreadTextsCtrl - on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        showText(textNo);
      });
      
      $scope.canReadNext = function () {
        // Called to check if $scope.readNext() can be called or not.
        if ($scope.$parent.canReadNext != null) {
          var parentCanReadNext = $scope.$parent.canReadNext();
          return parentCanReadNext && !$scope.readerTextIsLoading && !$scope.textIsLoading;
        } else {
          $log.log("CRITICAL! Parent scope to ReaderCtrl must implement $scope.canReadNext()");
          return false;
        }
      };
      
      $scope.preReadNextCheck = function () {
        // Called before the action in $scope.readNext(). The action
        // is only called if $scope.preReadNextCheck() returns true.
        if ($scope.$parent.preReadNextCheck != null) {
          return $scope.$parent.preReadNextCheck();
        } else {
          $log.log("CRITICAL! Parent scope to ReaderCtrl must implement $scope.preReadNextCheck()");
          return false;
        }
      };
      
      $scope.readNext = function() {
        if ($scope.preReadNextCheck()) {
          showNextText();
        }
      };
      
      var hasInitialized = false;
      if ($routeParams.text) {
        // If we have a text number in the route parameters, add it to
        // the reader. We want to read this text rather than just show
        // it.
        readText($routeParams.text);
        hasInitialized = true;
      } else {
        // fixme: this initialization isn't nice. what can we do instead?
        // 
        // The reason why we do this is because we don't know when the
        // parent controller has set the membership for the reader.
        // The pending text (if any) is available directly, but not
        // the membership, so if we should start with a new unread
        // text, we don't know when.
        // 
        // Perhaps the parent shouldn't give us the reader until it
        // has set the membership? Then we could $watch $scope.reader
        // instead.
        $scope.$watch('reader.isEmpty()', function (isEmpty) {
          if (!hasInitialized && !isEmpty) {
            hasInitialized = true;
            showNextText();
          }
        });
      }
      
      $scope.showCommented = function() {
        $log.log('ReaderCtrl - showCommented()');
        if ($scope.text && !_.isEmpty($scope.text.comment_to_list)) {
          $scope.reader.unshiftPending.apply(
            $scope.reader,
            _.map($scope.text.comment_to_list, function(ct) {
              return ct.text_no;
            }));

          if ($scope.reader.hasPending()) {
            showNextText();
          }
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
          
          if ($scope.reader.hasPending()) {
            showNextText();
          }
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
      
      keybindingService.bindPageSpecific('j', 'Read next text', function(e) {
        $scope.$apply(function() {
          if ($scope.canReadNext()) {
            $scope.readNext();
          }
        });
        return false;
      });

      keybindingService.bindPageSpecific('space', 'Read text', function(e) {
        if (isScrolledIntoView(angular.element('#jskomBelowText'))) {
          $scope.$apply(function() {
            // Check that the read next button is visible if we used space
            if ($scope.canReadNext()) {
              $scope.readNext();
            }
          });
          return false;
        } else {
          return true;
        }
      });
    }    
  ]).
  controller('TextCtrl', [
    '$scope', '$log', '$window', '$q',
    'messagesService', 'marksService', 'textsService',
    function($scope, $log, $window, $q,
             messagesService, marksService, textsService) {
      $scope.marks = null;
      $scope.currentMark = null;
      
      function updateMarks() {
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
        updateMarks();
      });
      
      $scope.$watch('marks', function(newMarks) {
        updateMarks();
      }, true);
      
      
      $scope.textIsLoading = false;
      $scope.showText = function (textNo) {
        $scope.textIsLoading = true;
        angular.element($window).scrollTop(1);
        return textsService.getText($scope.connection, textNo).then(
          function (text) {
            $scope.textIsLoading = false;
            
            if (text.jskomBodyType == 'html') {
              $scope.textMode = 'html';
            } else {
              $scope.textMode = 'text';
            }
            
            $scope.text = text;
            $scope.$emit("jskom:text:shown", text);
            return text;
          },
          function(response) {
            $scope.textIsLoading = false;
            if (response.status == 404) {
              messagesService.showMessage('error', 'No such text',
                                          'No text with number: ' + response.data.error_status);
            } else {
              messagesService.showMessage('error', 'Failed to get text.', response.data);
            }
            
            return $q.reject(response);
          });
      };
    }
  ]);
