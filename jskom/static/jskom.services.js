// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', []).
  factory('messagesService', [
    '$rootScope', '$log',
    function($rootScope, $log) {
      var messageBroadcastName = 'messagesService:message';
      var clearAllBroadcastName = 'messagesService:clearAll';
      return {
        createMessage: function(level, heading, text) {
          return {
            level: level,
            heading: heading,
            text: text
          };
        },
        
        showMessage: function(level, heading, text) {
          return this.show(this.createMessage(level, heading, text));
        },
        
        show: function(message) {
          $rootScope.$broadcast(messageBroadcastName, message);
        },
        
        onMessage: function(listener) {
          return $rootScope.$on(messageBroadcastName, function(event, message) {
            listener.call(this, message);
          });
        },
        
        clearAll: function() {
          $rootScope.$broadcast(clearAllBroadcastName);
        },
        
        onClearAll: function(listener) {
          return $rootScope.$on(clearAllBroadcastName, function(event) {
            listener.call(this);
          });
        }
      };
    }
  ]).
  factory('conferencesService', [
    '$http',
    function($http) {
      var config = { withCredentials: true };
      
      return {
        getUnreadConferences: function() {
          return $http.get(jskom.Settings.HttpkomServer + '/conferences/unread/', config);
        }
      };
    }
  ]).
  factory('textsService', [
    '$http',
    function($http) {
      var config = { withCredentials: true };
      
      return {
        getText: function(textNo) {
          return $http.get(jskom.Settings.HttpkomServer + '/texts/' + textNo, config);
        },
        
        createText: function(text) {
          return $http.post(jskom.Settings.HttpkomServer + '/texts/', text, config);
        }
      };
    }
  ]);
