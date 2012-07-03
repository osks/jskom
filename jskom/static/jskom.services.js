// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', []).
  factory('authService', [
    '$http', '$log',
    function($http, $log) {
      var config = { withCredentials: true };
      
      return {
        createSession: function(session) {
          return $http.post(jskom.Settings.HttpkomServer + '/sessions/', session, config);
        },
        
        destroySession: function(sessionId) {
          return $http.delete(jskom.Settings.HttpkomServer + '/sessions/' + sessionId, config);
        },
        
        getSession: function(sessionId) {
          return $http.get(jskom.Settings.HttpkomServer + '/sessions/' + sessionId, config);
        },
        
        getCurrentSessionId: function() {
          return $.cookie('session_id');
        },
        
        getCurrentSession: function() {
          var sessionId = this.getCurrentSessionId();
          return this.getSession(sessionId);
        }
      };
  }]).
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
  ]).
  factory('conferencesService', [
    '$http',
    function($http) {
      var config = { withCredentials: true };
      
      return {
        getConference: function(confNo) {
          return $http.get(jskom.Settings.HttpkomServer + '/conferences/' + confNo, config);
        },
        
        getUnreadConferences: function() {
          return $http.get(jskom.Settings.HttpkomServer + '/conferences/unread/', config);
        },
      };
    }
  ]).
  factory('readMarkingsService', [
    '$http',
    function($http) {
      var config = { withCredentials: true };
      
      return {
        getReadMarkingsForUnreadInConference: function(confNo) {
          var cfg = _.clone(config);
          return $http.get(jskom.Settings.HttpkomServer + '/conferences/' + confNo +
                           '/read-markings/?unread=true', cfg);
        },
        
        // createLocalReadMarking: function(confNo, localTextNo) {},
        
        createGlobalReadMarking: function(textNo) {
          return $http.put(jskom.Settings.HttpkomServer +
                           '/texts/' + textNo + '/read-marking', null, config);
        },
        
        destroyGlobalReadMarking: function(textNo) {
          return $http.delete(jskom.Settings.HttpkomServer + '/texts/' + textNo, config);
        },
      };
    }
  ]).
  factory('readQueueService', [
    '$log', 'readMarkingsService',
    function($log, readMarkingsService) {
      
      return {
        getReadQueueForConference: function(confNo, successFn, errorFn) {
          var readQueue = new ReadQueue();
          
          readMarkingsService.getReadMarkingsForUnreadInConference(confNo).
            success(function(data, status, headers, config) {
              // data.rms
              var textNos = _.map(data.rms, function(rm) {
                return rm.text_no;
              });
              readQueue.add(textNos);
              
              if (successFn) {
                successFn(data, status, headers, config);
              }
            }).
            error(function(data, status, headers, config) {
              if (errorFn) {
                errorFn(data, status, headers, config);
              }
            });
          
          return readQueue;
        }
      };
    }
  ]);
