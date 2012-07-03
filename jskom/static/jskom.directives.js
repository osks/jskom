// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.directives', []).
  directive('jskomA', [
    // Examples:
    // <jskom:a text-no="{{ text.text_no }}">Text: {{text.text_no}}</jskom:a>
    // <jskom:a conf-no="{{ text.conf_no }}">Conference: {{text.conf_no}}</jskom:a>
    
    '$log', '$location',
    function($log, $location) {
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
            // Is this necessary?
            $log.log("jskomA - showText() - iAttrs.href: " + iAttrs.href);
            $location.path(iAttrs.href);
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
        template: '' +
          '<ng-switch on="type" ng-show="text">' +
          '  <div ng-switch-when="text" ng-bind-html="text.body|formatTextBody"></div>' +
          '  <div ng-switch-when="image"><img ng-src="{{ imageUrl }}" /></div>' +
          '  <div ng-switch-default>' +
          '    [unknown content-type: &quot;{{ text.content_type }}&quot;]' +
          '</div>' +
          '</ng-switch>' +
          '<div ng-hide="text">[no text]</div>' +
          '',
        scope: {},
        link: function(scope, iElement, iAttrs) {
          scope.$parent.$watch(iAttrs.model, function(newText) {
            scope.text = newText;
            
            if (scope.text) {
              // todo: make this a function or property on the model.
              var mimeType = Mimeparse.parseMimeType(newText.content_type);
              scope.type = mimeType[0];
            } else {
              scope.type = '';
            }
            
            if (scope.type == 'image') {
              // todo: make this a function (or property) on the model.
              scope.imageUrl = jskom.Settings.HttpkomServer +
                '/texts/' + scope.text.text_no + '/body';
            } else {
              scope.imageUrl = '';
            }
          });
          
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
            scope.text = newText;
          });
        }
      };
    }
  ]);
