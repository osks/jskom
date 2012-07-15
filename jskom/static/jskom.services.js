// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', ['jskom.settings']).
  factory('keybindingService',[
    '$log', '$rootScope',
    function($log, $rootScope) {
      
      // This is supposed to reset all events on "page load", but
      // since we don't actually reload pages here, we reset them when
      // the route (url) is changing.
      $rootScope.$on('$routeChangeStart', function(route) {
        //$log.log("keybindingService - on($routeChangeSuccess)");
        Mousetrap.reset();
      });
      
      return {
        bind: function() {
          Mousetrap.bind.apply(this, arguments);
        },
        
        reset: function() {
          Mousetrap.reset();
        }
      };
    }
  ]). 
  factory('pageTitleService', [
    '$window',
    function($window) {
      return {
        set: function(title) {
          if (title && title.length > 0) {
            $window.document.title = "jskom - " + title;
          } else {
            $window.document.title = "jskom";
          }
        }
      };
    }
  ]).
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
    '$http', 'httpkomServer',
    function($http, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
        getText: function(textNo) {
          return $http.get(httpkomServer + '/texts/' + textNo, config);
        },
        
        createText: function(text) {
          return $http.post(httpkomServer + '/texts/', text, config);
        }
      };
    }
  ]).
  factory('conferencesService', [
    '$http', 'httpkomServer',
    function($http, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
        getConference: function(confNo) {
          return $http.get(httpkomServer + '/conferences/' + confNo, config);
        },
        
        getUnreadConferences: function() {
          return $http.get(httpkomServer + '/conferences/unread/', config);
        },
      };
    }
  ]).
  factory('readMarkingsService', [
    '$http', 'httpkomServer',
    function($http, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
        getReadMarkingsForUnreadInConference: function(confNo) {
          var cfg = _.clone(config);
          return $http.get(httpkomServer + '/conferences/' + confNo +
                           '/read-markings/?unread=true', cfg);
        },
        
        // createLocalReadMarking: function(confNo, localTextNo) {},
        
        createGlobalReadMarking: function(textNo) {
          return $http.put(httpkomServer +
                           '/texts/' + textNo + '/read-marking', null, config);
        },
        
        destroyGlobalReadMarking: function(textNo) {
          return $http.delete(httpkomServer +
                              '/texts/' + textNo + '/read-marking', config);
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
