// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.directives', []).
  directive('jskomA', [
    // <jskom:a text-no="{{ text.text_no }}">Text: {{text.text_no}}</jskom:a>
    // <jskom:a conf-no="{{ text.conf_no }}">Conference: {{text.conf_no}}</jskom:a>
    
    '$location',
    function($location) {
      return {
        restrict: 'E',
        replace: true,
        template: '<a ng-href="{{href}}" ng-click="showText($event)" ng-transclude></a>',
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
          
          scope.showText = function() {
            //jskom.Log.debug("jskomA - showText() - iAttrs.href: " + iAttrs.href);
            $location.path(iAttrs.href);
          };
        }
      };
    }
  ]);
