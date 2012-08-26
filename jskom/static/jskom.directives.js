// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

// ngSanitize is needed for bind-html, which we use in jskom:text-body.
angular.module('jskom.directives', ['jskom.services', 'ngSanitize']).
  directive('jskomBindBody', [
    // Example:
    // <div jskom-bind-body="text.body"></div>
    
    '$log', '$compile', 'htmlFormattingService',
    function($log, $compile, htmlFormattingService) {
      return {
        restrict: 'A',
        link: function(scope, iElement, iAttrs) {
          scope.$watch(iAttrs.jskomBindBody, function(value) {
            var str;
            if (!value) {
              str = "";
            }
            else if (_.isObject(value)) {
              str = angular.toJson(value);
            } else {
              str = value.toString();
            }
            var formattedBody = htmlFormattingService.formatBody(str);
            var templateHtml = angular.element('<article>' + formattedBody + '</article>');
            $compile(templateHtml)(scope);
            iElement.html(templateHtml);
          });
        }
      };
    }
  ]).
  directive('jskomBindLinkified', [
    // Example:
    // <span jskom-bind-linkified="text.body"></span>
    
    '$log', '$compile', 'htmlFormattingService',
    function($log, $compile, htmlFormattingService) {
      return {
        restrict: 'A',
        link: function(scope, iElement, iAttrs) {
          scope.$watch(iAttrs.jskomBindLinkified, function(value) {
            var str;
            if (!value) {
              str = "";
            }
            else if (_.isObject(value)) {
              str = angular.toJson(value);
            } else {
              str = value.toString();
            }
            var formattedBody = htmlFormattingService.linkifyLyskomLinks(str);
            var templateHtml = angular.element('<span>' + formattedBody + '</span>');
            $compile(templateHtml)(scope);
            iElement.html(templateHtml);
          });
        }
      };
    }
  ]).
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
        $location.url(href);
      });
      
      $rootScope.$on(confEmit, function($event, confNo, href) {
        //$log.log("on(jskom:a:conference) - href - " + href);
        $event.stopPropagation();
        $location.url(href);
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
            
            //$log.log("jskomA - click() - iAttrs.href: " + iAttrs.href);
            
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
    // Example: <jskom:text></jskom:text>
    
    // This basically just does what ng-include do, but without
    // creating a new scope.
    
    '$log', 'templatePath',
    function($log, templatePath) {
      return {
        restrict: 'E',
        templateUrl: templatePath('text.html'),
        link: function(scope, iElement, iAttrs, controller) {
        }
      };
    }
  ]).
  directive('jskomConfInput', [
    // Example:
    // <jskom:conf-input model="session.person.pers_no" only-pers></jskom:conf-input>
    
    '$log', '$window', '$timeout',
    'templatePath', 'conferencesService', 'messagesService',
    function($log, $window, $timeout,
             templatePath, conferencesService, messagesService) {
      var errorMsgText = function(wantPers, wantConfs) {
        if (!wantPers) {
          return "conference";
        } else if (!wantConfs) {
          return "person";
        } else {
          return "conference or person";
        }
      };
      
      return {
        restrict: 'E',
        replace: true,
        templateUrl: templatePath('conf_input.html'),
        scope: {
          model: '=',
        },
        controller: [
          '$scope',
          function(scope) {
            scope.isLoading = false;
            // This function is because if we don't want to use
            // ng-show/ng-hide on an extra icon in the button. If we have
            // an extra icon, the width will be calculated wrong until
            // angular has done the processing, so the conf input
            // flickers.
            scope.getLoadingClass = function() {
              if (scope.isLoading) {
                return 'icon-refresh';
              } else {
                return 'icon-search icon-white';
              }
            };
            
            scope.wantPers = true;
            scope.wantConfs = true;
            
            scope.matches = [];
            scope.lookup = '';
            scope.conf = null;
            
            scope.$watch('model', function(newModel, oldModel) {
              //$log.log("<jskom:conf-input> - $watch(model) - new: " + newModel);
              //$log.log("<jskom:conf-input> - $watch(model) - old: " + oldModel);
              
              if (newModel && newModel !== oldModel) {
                // We got a new model (person number) that has
                // changed from last time.
                
                var isModelInMatches = _.any(scope.matches, function (match) {
                  return match.conf_no === newModel;
                });
                //$log.log("<jskom:conf-input> - $watch(model) - isInMatches: " + isModelInMatches);
                if (!isModelInMatches) {
                  // If the current set of matches doesn't include the new model
                  // it has probably been changed from the "outside" and we should
                  // do a new look-up. Assume it's a conf number.
                  scope.clearMatching();
                  scope.lookup = '#' + newModel;
                  scope.getConf();
                }
              }
            });
            
            scope.clearMatching = function() {
              scope.conf = null;
              scope.matches = [];
              scope.delayedResize();
            };
            
            scope.getConf = function() {
              if (scope.isLoading
                  || !(scope.lookup && scope.lookup.length > 0)
                  || scope.conf) {
                return;
              }
              
              scope.isLoading = true;
              conferencesService.lookupConferences(scope.lookup, scope.wantPers, scope.wantConfs).
                success(function(data) {
                  $log.log("<jskom:conf-input> - lookupConferences(" + scope.lookup + ") - success");
                  scope.isLoading = false;
                  scope.matches = data.conferences;
                  if (scope.matches.length > 0) {
                    scope.conf = scope.matches[0];
                    scope.model = scope.conf.conf_no;
                  } else {
                    scope.conf = null;
                    scope.model = null;
                    messagesService.showMessage('error', 'Could not find any ' +
                                                errorMsgText(scope.wantPers, scope.wantConfs) +
                                                ' with that name.');
                  }
                  scope.delayedResize();
                }).
                error(function(data) {
                  $log.log("<jskom:conf-input> - lookupConferences(" + scope.lookup + ") - error");
                  scope.isLoading = false;
                  messagesService.showMessage('error', 'Failed to lookup ' + 
                                              errorMsgText(scope.wantPers, scope.wantConfs) +
                                              '.', data);
                });
            };
          }
        ],
        link: function(scope, iElement, iAttrs) {
          var lookupInputEl = iElement.find('.jskomConfInputLookup input');
          var lookupButtonEl = iElement.find('.jskomConfInputLookup button');
          var confNameInputEl = iElement.find('.jskomConfInputConfName input');
          var confNameButtonEl = iElement.find('.jskomConfInputConfName button');
          var matchesInputEl = iElement.find('.jskomConfInputMatches select');
          var matchesButtonEl = iElement.find('.jskomConfInputMatches button');
          
          angular.element(lookupInputEl).keydown(function(e) {
            if (e.keyCode == 13) {
              scope.getConf();
            }
          });
          
          lookupInputEl.bind('blur', function(e) {
            //$log.log("<jskom:conf-input> - .confInputLookupName - blur");
            scope.getConf();
          });
          
          if (('onlyPers' in iAttrs)) {
            scope.wantConfs = false;
          }
          if (('onlyConfs' in iAttrs)) {
            scope.wantPers = false;
          }
          
          var resize = function() {
            //$log.log("<jskom:conf-input> - resize");
            var elWidth = iElement.width();
            
            if (matchesInputEl.is(':visible')) {
              matchesInputEl.width(
                elWidth - matchesButtonEl.outerWidth() -
                  (matchesInputEl.outerWidth() - matchesInputEl.width()) -
                  4);
            }
            
            if (lookupInputEl.is(':visible')) {
              lookupInputEl.width(
                elWidth - lookupButtonEl.outerWidth() -
                  (lookupInputEl.outerWidth() - lookupInputEl.width()) -
                  0);
            }
            
            if (confNameInputEl.is(':visible')) {
              confNameInputEl.width(
                elWidth - confNameButtonEl.outerWidth() -
                  (confNameInputEl.outerWidth() - confNameInputEl.width()) -
                  0);
            }
          };
          var delayedResizePromise = null;
          scope.delayedResize = function() {
            if (!delayedResizePromise) {
              delayedResizePromise = $timeout(function() {
                resize();
                delayedResizePromise = null;
              }, 200);
            }
          };
          angular.element($window).resize(function() {
            scope.$apply(function() {
              scope.delayedResize();
            });
          });
          resize();
          scope.delayedResize();
        }
      };
    }
  ]).
  directive('jskomTextFields', [
    // Example:
    //   <jskom:text-fields text="newComment"></jskom:text-fields>
    
    '$log', 'templatePath',
    function($log, templatePath) {
      var recipientTypes = [
        { name: 'To', type: 'to' },
            { name: 'CC', type: 'cc' },
        { name: 'BCC', type: 'bcc' }
      ];
      
      return {
        restrict: 'E',
        templateUrl: templatePath('textform.html'),
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
    
    '$log', 'templatePath', 'textsService', 'messagesService', 'keybindingService',
    function($log, templatePath, textsService, messagesService, keybindingService) {
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
          content_type: 'text/plain',
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
        templateUrl: templatePath('newcommentform.html'),
        scope: {
          isVisible: '=visible',
          commentedText: '=commentTo'
        },
        link: function(scope, iElement, iAttrs) {
          scope.isCreatingComment = false;
          
          scope.$watch('isVisible', function(newIsVisible) {
            if (newIsVisible) {
              // When it's time to show: create a new comment based on
              // the text we are commenting. This is to avoid having
              // to do name look-ups for the commented conferences for
              // each text we read.
              scope.comment = newComment(scope.commentedText);
              iElement.find('textarea').focus();
            } else {
              scope.comment = newComment(); // new empty comment
            }
          });
          
          scope.cancel = function() {
            scope.isVisible = false;
          };
          
          scope.createComment = function(event) {
            // Make sure the form is visible before creating the
            // comment.  With tab you can select the button and toggle
            // it even when the form is hidden.
            if (scope.isVisible && !scope.isCreatingComment) {
              scope.isCreatingComment = true;
              textsService.createText(scope.comment).then(
                function(response) {
                  $log.log("jskomNewComment - createComment() - success");
                  scope.isCreatingComment = false;
                  messagesService.showMessage('success', 'Successfully created comment.',
                                              'Text number ' + response.data.text_no +
                                              ' was created.');
                  scope.cancel();
                  
                  if (event) {
                    // If we got the event param, we were called form
                    // the button and we want to blur (un-focus) the
                    // button so keyboard commands work again.  We
                    // will close the form anyway, so no point in
                    // having it focused.
                    angular.element(event.target).blur();
                  }
                },
                function(response) {
                  $log.log("jskomNewComment - createComment() - error");
                  scope.isCreatingComment = false;
                  messagesService.showMessage('error', 'Failed to create comment.',
                                              response.data);
                });
            }
          };
        }
      };
    }
  ]);
