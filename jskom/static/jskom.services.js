// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', ['jskom.settings']).
  factory('htmlFormattingService', [
    '$log',
    function($log) {
      var escape = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
      };
      
      var badChars = /&(?!\w+;)|[<>"'`]/g;
      var possible = /[&<>"'`]/;
      
      var escapeChar = function(chr) {
        return escape[chr] || "&amp;";
      };
      
      // Escape html tags
      var escapeExpression = function(string) {
        if (string == null || string === false) {
          return "";
        }
        if (!possible.test(string)) {
          return string;
        }
        return string.replace(badChars, escapeChar);
      };
      
      // http://daringfireball.net/2010/07/improved_regex_for_matching_urls
      var urlRegexp = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
      
      var lyskomTextNumberRegexp = /\b([0-9]{4,})\b/g;
      
      var replaceMultiple = function(str, replacers) {
        var i = 0;
        var replace = function(str, regexp, replaceFunc, tmpObj) {
          var matches = str.match(regexp);
          if (matches) {
            _.each(_.uniq(matches), function(match) {
              str = str.replace(match, '<$' + i +'$>');
              tmpObj['<$' + i + '$>'] = replaceFunc(match);
              ++i;
            });
            }
          return str;
        };
        
        var tmp = {};
        _.each(replacers, function(replacer) {
          str = replace(str, replacer.regexp, replacer.func, tmp);
        });
        _.each(tmp, function(value, key) {
          str = str.replace(key, value);
        });
        
        return str;
      };
      
      return {
        formatBody: function(rawBody) {
          var escaped = this.escapeHtml(rawBody);
          escaped = this.formatLineBreaks(escaped);
          
          escaped = replaceMultiple(escaped, [
            {
              regexp: urlRegexp,
              func: function(match) {
                return '<a href="' + encodeURI(match) + '">' + match + '</a>';
              }
            },
            {
              regexp: lyskomTextNumberRegexp,
              func: function(match) {
                return '<jskom:a text-no="' + encodeURI(match) + '">' + match + '</jskom:a>';
              },
            }
          ]);
          
          return escaped;
        },
        
        escapeHtml: function(htmlStr) {
          return escapeExpression(htmlStr);
        },
        
        formatLineBreaks: function(htmlStr) { 
          return htmlStr.replace(/\r?\n|\r/g, "<br/>");
        },
        
        linkifyUrls: function(htmlStr) {
          var replacer = function(match, p1) {
            return '<a href="' + encodeURI(p1) + '">' + p1 + '</a>';
          };
          return htmlStr.replace(urlRegexp, replacer);
        },
        
        linkifyLyskomLinks: function(htmlStr) {
          var replacer = function(match, p1) {
            return '<jskom:a text-no="' + encodeURI(p1) + '">' + p1 + '</jskom:a>';
          };
          return htmlStr.replace(lyskomTextNumberRegexp, replacer);
        }
      };
    }
  ]).
  factory('keybindingService', [
    '$log', '$rootScope',
    function($log, $rootScope) {
      Mousetrap.reset();
      var keyBindings = [];
      
      var resetBindings = function() {
        var kbsByLocal = _.groupBy(keyBindings, 'isLocal');
        
        _.each(kbsByLocal['true'], function(kb) {
          // Only unbind local bindings on reset.
          _.each(kb.keys, function(key) {
            unbindKey(key);
          });
        });
        
        keyBindings = kbsByLocal['false']; // Keep only the non-locals.
      };
      
      var removeBindingsForKey = function(key) {
        var keep = [];
        _.each(keyBindings, function(keyBinding) {
          if (_.include(keyBinding.keys, key)) {
            unbindKey(key);
            // If there is more than one key (i.e. any other than
            // 'key') for this binding, keep it, but remove 'key' from
            // its keys.
            if (_.size(keyBinding.keys) > 1) {
              keyBinding.keys = _.without(keyBinding.keys, key);
              keep.push(keyBinding);
            }
          } else {
            keep.push(keyBinding);
          }
        });
        keyBindings = keep;
      };
      
      var addBinding = function(keyBinding) {
        if (_.isString(keyBinding.keys)) {
          var keyArr = [keyBinding.keys];
          keyBinding.keys = keyArr;
        };
        
        _.each(keyBinding.keys, function(key) {
          removeBindingsForKey(key);
          bindKey(key, keyBinding.callback);
        });
        
        keyBindings.push(keyBinding);
      };
      
      var bindKey = function(key, callbackFn) {
        //$log.log("keybindingService - bindKey: " + key);
        Mousetrap.bind(key, callbackFn);
      };
      
      var unbindKey = function(key) {
        //$log.log("keybindingService - unbindKey: " + key);
        Mousetrap.unbind(key);
      };
      
      // This is supposed to reset all events on "page load", but
      // since we don't actually reload pages here, we reset them when
      // the route (url) is changing.
      $rootScope.$on('$routeChangeStart', function() {
        resetBindings();
      });
      
      return {
        bind: function(keys, description, callbackFn, isLocal) {
          addBinding({
            keys: keys,
            isLocal: isLocal,
            description: description,
            callback: callbackFn
          });
        },
        
        bindGlobal: function(keys, description, callbackFn) {
          addBinding({
            keys: keys,
            isLocal: false,
            description: description,
            callback: callbackFn
          });
        },
        
        bindLocal: function(keys, description, callbackFn) {
          addBinding({
            keys: keys,
            isLocal: true,
            description: description,
            callback: callbackFn
          });
        },
        
        reset: function() {
          resetBindings();
        },
        
        getBindings: function() {
          return keyBindings;
        },
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
    '$log', '$http', 'httpkomServer',
    function($log, $http, httpkomServer) {
      var config = { withCredentials: true };
      
      var enhanceText = function(text) {
        var mimeType = Mimeparse.parseMimeType(text.content_type);
        text._type = mimeType[0];
        
        if (text.type == 'image') {
          text._image_url = httpkomServer + '/texts/' + text.text_no + '/body';
        } else {
          text._image_url = null;
        }
        
        return text;
      };
      
      return {
        getText: function(textNo) {
          var p = $http.get(httpkomServer + '/texts/' + textNo, config);
          return p.success(function(data) {
            data = enhanceText(data);
            return p;
          });
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
        lookupConferences: function(name, wantPers, wantConfs) {
          return $http.get(httpkomServer + '/conferences/',
                           _.extend({
                             params: {
                               "name": name,
                               "want_pers": wantPers,
                               "want_confs": wantConfs
                             }
                           }, config));
        },
        
        getConference: function(confNo) {
          return $http.get(httpkomServer + '/conferences/' + confNo, config);
        },

        getUnreadConferences: function() {
          return $http.get(httpkomServer + '/conferences/unread/', config);
        },
        
        setNumberOfUnreadTexts: function(confNo, noOfUnread) {
          var data = { no_of_unread: parseInt(noOfUnread) };
          return $http.post(httpkomServer + '/conferences/' + confNo + '/no-of-unread',
                            data, config);
        }
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
