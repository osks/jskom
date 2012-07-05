// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

// ngSanitize is needed for bind-html, which we use in jskom:text-body.
angular.module('jskom.directives', ['ngSanitize']).
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
  directive('jskomTextBody', [
    // Example: <jskom:text-body model="text"></jskom:text-body>
    '$log',
    function($log) {
      
      return {
        restrict: 'E',
        templateUrl: '/static/partials/textbody.html',
        scope: {
        },
        link: function(scope, iElement, iAttrs) {
          scope.$parent.$watch(iAttrs.model, function(newText) {
            scope.text = newText;
          });
          
          scope.$watch('mode', function(newMode) {
            //$log.log("new mode: " + newMode);
            
            iElement.find('.nav li').removeClass('active');
            iElement.find('.nav #mode-' + newMode).addClass('active');
          });
          
          scope.mode = "default";
        }
      };
    }
  ]).
  directive('jskomText', [
    // Example: <jskom:text model="text"></jskom:text>
    
    '$log',
    function($log) {
      return {
        restrict: 'E',
        templateUrl: '/static/partials/text.html',
        scope: {},
        link: function(scope, iElement, iAttrs) {
          scope.$parent.$watch(iAttrs.model, function(newText) {
            if (newText) {
              // todo: move this somewhere else
              var mimeType = Mimeparse.parseMimeType(newText.content_type);
              scope.type = mimeType[0];
              
              if (scope.type == 'image') {
                // todo: move this somewhere else
                scope.imageUrl = jskom.Settings.HttpkomServer +
                  '/texts/' + newText.text_no + '/body';
              } else {
                scope.imageUrl = '';
              }
            }
            
            scope.text = newText;
          });

        }
      };
    }
  ]);
