// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

// ngSanitize is needed for bind-html, which we use in jskom:text-body.
angular.module('jskom.directives', ['jskom.services', 'ngSanitize']).
  directive('jskomA', [
    // Examples:
    // <jskom:a text-no="{{ text.text_no }}">Text: {{text.text_no}}</jskom:a>
    // <jskom:a conf-no="{{ text.conf_no }}">Conference: {{text.conf_no}}</jskom:a>
    
    '$log', '$location', '$rootScope',
    function($log, $location, $rootScope) {
      var textEmit = 'jskom:a:text';
      var confEmit = 'jskom:a:conference';
      
      $rootScope.$on(textEmit, function($event, textNo, href) {
        //$log.log("on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        $location.path(href);
      });
      
      $rootScope.$on(confEmit, function($event, confNo, href) {
        //$log.log("on(jskom:a:conference) - href - " + href);
        $event.stopPropagation();
        $location.path(href);
      });
      
      return {
        restrict: 'E',
        replace: true,
        template: '<a ng-href="{{href}}" ng-click="click($event)" ng-transclude></a>',
        transclude: true,
        scope: {
          textNo: '@',
          confNo: '@'
        },
        link: function(scope, iElement, iAttrs) {
          scope.$watch('textNo', function(newValue) {
            if (newValue) {
              scope.href = '/texts/' + newValue;
            }
          });
          
          scope.$watch('confNo', function(newValue) {
            if (newValue) {
              scope.href = '/conferences/' + newValue;
            }
          });
          
          scope.click = function($event) {
            $event.stopPropagation();
            $event.preventDefault();
            
            $log.log("jskomA - click() - iAttrs.href: " + iAttrs.href);
            
            if (scope.textNo) {
              scope.$emit(textEmit, scope.textNo, iAttrs.href);
            } else if (scope.confNo) {
              scope.$emit(confEmit, scope.confNo, iAttrs.href);
            }
          };
        }
      };
    }
  ]).
  directive('jskomText', [
    // Example: <jskom:text text="text"></jskom:text>
    
    '$log', 'httpkomServer',
    function($log, httpkomServer) {
      return {
        restrict: 'E',
        templateUrl: '/static/partials/text.html',
        scope: {
          text: '=',
        },
        link: function(scope, iElement, iAttrs) {
          scope.$watch('text', function(newText) {
            if (newText) {
              // todo: move this somewhere else
              var mimeType = Mimeparse.parseMimeType(newText.content_type);
              scope.type = mimeType[0];
              
              if (scope.type == 'image') {
                // todo: move this somewhere else
                scope.imageUrl = httpkomServer +
                  '/texts/' + newText.text_no + '/body';
              } else {
                scope.imageUrl = '';
              }
            }
            
            scope.text = newText;
          });
          
          scope.mode = "default";
        },
      };
    }
  ]).
  directive('jskomMarkAsRead', [
    // <jskom:mark-as-read text="text" read-on-load></jskom:mark-as-read>
    
    '$log', 'readMarkingsService', 'messagesService',
    function($log, readMarkingsService, messagesService) {
      return {
        restrict: 'E',
        templateUrl: '/static/partials/text_markasread.html',
        scope: {
          text: '=',
        },
        link: function(scope, iElement, iAttrs) {
          scope.isRequesting = false;
          
          scope.markAsRead = function() {
            if (scope.text) {
              var text = scope.text;
              scope.isRequesting = true;
              readMarkingsService.createGlobalReadMarking(text.text_no).
                success(function(data) {
                  $log.log("jskomMarkAsRead - markAsRead(" + text.text_no + ") - success");
                  scope.isRequesting = false;
                  text.is_unread = false;
                }).
                error(function(data, status) {
                  $log.log("jskomMarkAsRead - markAsRead(" + text.text_no + ") - error");
                  scope.isRequesting = false;
                  messagesService.showMessage('error', 'Failed to mark text as read.', data);
                });
            }
          };
          
          scope.markAsUnread = function() {
            if (scope.text) {
              var text = scope.text;
              scope.isRequesting = false;
              readMarkingsService.destroyGlobalReadMarking(text.text_no).
                success(function(data) {
                  $log.log("jskomMarkAsRead - markAsUnread(" + text.text_no + ") - success");
                  scope.isRequesting = false;
                  text.is_unread = true;
                }).
                error(function(data, status) {
                  $log.log("jskomMarkAsRead - markAsUnread(" + text.text_no + ") - error");
                  scope.isRequesting = false;
                  messagesService.showMessage('error', 'Failed to mark text as read.', data);
                });
            }
          };
          
          scope.$watch('text', function(newText) {
            if (newText) {
              if (('readOnLoad' in iAttrs) && newText.is_unread) {
                scope.markAsRead();
              }
            }
          });
        }
      }; 
    }
  ]).
  directive('jskomTextFields', [
    // Example:
    //   <jskom:text-fields text="newComment"></jskom:text-fields>
    
    '$log',
    function($log) {
      var recipientTypes = [
        { name: 'To', type: 'to' },
            { name: 'CC', type: 'cc' },
        { name: 'BCC', type: 'bcc' }
      ];
      
      return {
        restrict: 'E',
        templateUrl: '/static/partials/textform.html',
        scope: {
          text: '='
        },
        link: function(scope, iElement, iAttrs) {
          scope.recipientTypes = recipientTypes;
          
          scope.newRecipient = function() {
            return { type: 'to', conf_name: '' }
          };
        }
      };
    }
  ]).
  directive('jskomNewComment', [
    // Example:
    //   <jskom:new-comment comment-to="text"></jskom:new-comment>
    
    '$log', 'textsService', 'messagesService', 'keybindingService',
    function($log, textsService, messagesService, keybindingService) {
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
      
      var newComment = function(commentedText) {
        var comment = {
          recipient_list: [],
          content_type: 'text/x-kom-basic',
          subject: '',
          body: ''
        };
        if (commentedText) {
          makeCommentTo(comment, commentedText);
        }
        return comment;
      };
      
      return {
        restrict: 'E',
        templateUrl: '/static/partials/newcommentform.html',
        scope: {
          isVisible: '=visible',
          commentedText: '=commentTo'
        },
        link: function(scope, iElement, iAttrs) {
          scope.comment = newComment(scope.commentedText);
          
          scope.$watch('isVisible', function(newIsVisible) {
            if (newIsVisible) {
              iElement.find('textarea').focus();
            }
          });
          
          scope.$watch('commentedText', function(newCommentedText) {
            scope.cancel();
          });
          
          scope.cancel = function() {
            scope.isVisible = false;
            scope.comment = newComment(scope.commentedText);
          };
          
          scope.createComment = function(event) {
            // Make sure the form is visible before creating the
            // comment.  With tab you can select the button and toggle
            // it even when the form is hidden.
            if (scope.isVisible) {
              textsService.createText(scope.comment).
                success(function(data) {
                  $log.log("jskomNewComment - createComment() - success");
                  messagesService.showMessage('success', 'Successfully created comment.',
                                              'Text number ' + data.text_no + ' was created.');
                  scope.cancel();
            
                  if (event) {
                    // If we got the event param, we were called form
                    // the button and we want to blur (un-focus) the
                    // button so keyboard commands work again.  We
                    // will close the form anyway, so no point in
                    // having it focused.
                    angular.element(event.target).blur();
                  }
                }).
                error(function(data, status) {
                  $log.log("jskomNewComment - createComment() - error");
                  messagesService.showMessage('error', 'Failed to create comment.', data);
                });
            }
          };
          
          // Not working:
          /*keybindingService.bindLocal('ctrl+c ctrl+c', 'Post comment', function(e) {
            $log.log("jskomNewComment - bind(ctrl+c ctrl+c)");
            if (scope.isVisible) {
              // TODO
            }
          });*/
        }
      };
    }
  ]);
