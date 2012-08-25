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
    '$log', '$http', '$q', '$cacheFactory', 'httpkomServer',
    function($log, $http, $q, $cacheFactory, httpkomServer) {
      
      var cache = $cacheFactory('texts', { capacity: 100 });
      var config = { withCredentials: true };
      
      var enhanceText = function(text) {
        var mimeType = Mimeparse.parseMimeType(text.content_type);
        text._type = mimeType[0];
        
        if (text._type == 'image') {
          text._image_url = httpkomServer + '/texts/' + text.text_no + '/body';
        } else {
          text._image_url = null;
        }
        
        return text;
      };
      
      return {
        getText: function(textNo) {
          textNo = textNo.toString();
          var cachedResp = cache.get(textNo);
          
          if (cachedResp) {
            //$log.log("textsService - getText(" + textNo + ") - cached");
            return cachedResp;
          } else {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            $http.get(httpkomServer + '/texts/' + textNo, config).then(
              function(response) {
                $log.log("textsService - getText(" + textNo + ") - success");
                enhanceText(response.data);
                deferred.resolve(response);
              },
              function(response) {
                $log.log("textsService - getText(" + textNo + ") - error");
                cache.remove(textNo);
                deferred.reject(response);
              });
            
            cache.put(textNo, promise);
            return promise;
          }
        },
        
        createText: function(text) {
          return $http.post(httpkomServer + '/texts/', text, config).then(
            function(response) {
              _.each(text.comment_to_list, function(commentedText) {
                // Remove commented texts from the cache so we can
                // fetch them with the new text in their
                // comment_in_list.
                cache.remove(commentedText.text_no.toString());
              });
              return response;
            });
        }
      };
    }
  ]).
  factory('conferencesService', [
    '$http', '$log', 'httpkomServer',
    function($http, $log, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
        lookupConferences: function(name, wantPers, wantConfs) {
          return $http.get(httpkomServer + '/conferences/',
                           _.extend({
                             params: {
                               "name": name,
                               "want-pers": wantPers,
                               "want-confs": wantConfs
                             }
                           }, config));
        },
        
        getConference: function(confNo, micro) {
          if (arguments.length < 2) {
            micro = true;
          }
          return $http.get(httpkomServer + '/conferences/' + confNo,
                           _.extend({ params: { "micro": micro } }, config));
        },
      };
    }
  ]).
  factory('membershipsService', [
    '$http', 'httpkomServer',
    function($http, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
        setNumberOfUnreadTexts: function(confNo, noOfUnread) {
          var data = { no_of_unread: parseInt(noOfUnread) };
          return $http.post(httpkomServer + '/persons/current/memberships/' + confNo,
                            data, config);
        },
        
        getMembership: function(persNo, confNo, wantUnread) {
          return $http.get(httpkomServer + '/persons/' + persNo + '/memberships/' + confNo,
                           _.extend({ params: { "want-unread": wantUnread } }, config));
        },
        
        getMemberships: function(persNo, onlyUnread, wantUnread) {
          return $http.get(httpkomServer + '/persons/' + persNo + '/memberships/',
                           _.extend({
                             params: {
                               "want-unread": wantUnread,
                               "unread": onlyUnread,
                             }
                           }, config));
        },
      };
    }
  ]).
  factory('readMarkingsService', [
    '$http', 'httpkomServer',
    function($http, httpkomServer) {
      var config = { withCredentials: true };
      
      return {
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
  factory('readerService', [
    '$log', 'readerFactory', 'membershipsService',
    function($log, readerFactory, membershipsService) {
      return {
        getReader: function(confNo, persNo) {
          return membershipsService.getMembership(persNo, confNo, true).then(
            function(response) {
              var unreadQueue = readerFactory.createUnreadQueue(response.data.unread_texts);
              return readerFactory.createReader(unreadQueue);
            });
        }
      };
    }
  ]).
  factory('readerFactory', [
    '$log', 'textsService', 'readMarkingsService',
    function($log, textsService, readMarkingsService) {
      var markAsRead = function(text) {
        readMarkingsService.createGlobalReadMarking(text.text_no).
          success(function(data) {
            $log.log("readerFactory - markAsRead(" + text.text_no + ") - success");
            text._is_unread = false;
          }).
          error(function(data, status) {
            $log.log("readerFactory - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', data);
          });
      };
      
      var Reader = function(unreadQueue) {
        this._unreadQueue = unreadQueue;
        this._pending = [];
      };
      
      _.extend(Reader.prototype, {
        unshiftPending: function() {
          this._pending.unshift.apply(this._pending, arguments);
        },
        
        pushPending: function() {
          this._pending.push.apply(this._pending, arguments);
        },
        
        shift: function() {
          if (this._pending.length > 0) {
            return textsService.getText(this._pending.shift()).then(
              function(response) {
                return response.data;
              });
              
          } else {
            return textsService.getText(this._unreadQueue.dequeue()).then(
              function(response) {
                response.data._is_unread = true;
                markAsRead(response.data);
                return response.data;
              });
          }
        },
        
        hasPending: function() {
          return this._pending.length > 0;
        },
        
        hasUnread: function() {
          return this.unreadSize() > 0;
        },
        
        size: function() {
          return this._pending.length + this._unreadQueue.size();
        },
        
        pendingSize: function() {
          return this._pending.length;
        },
        
        unreadSize: function() {
          return this._unreadQueue.size();
        },
        
        isEmpty: function() {
          return !(this.size() > 0);
        }
      });
      
      
      
      var UnreadQueue = function() {
        this._currentTextNo = null;
        this._currentThreadStack = [];
        this._unreadTextNos = [];
        this._prefetchCount = 3;
      };
      
      _.extend(UnreadQueue.prototype, {
        enqueue: function(unreadTextNos) {
          this._unreadTextNos = _.union(this._unreadTextNos, unreadTextNos);
          this._unreadTextNos.sort();
          
          if (this._currentTextNo == null && this._unreadTextNos.length > 0) {
            this.moveNext();
          }
        },
        
        peek: function() {
          return this._currentTextNo;
        },
        
        dequeue: function() {
          var ret = this._currentTextNo;
          this.moveNext();
          return ret;
        },
        
        isEmpty: function() {
          return !(this.size() > 0);
        },
        
        size: function() {
          if (this._currentTextNo == null) {
            return this._unreadTextNos.length;
          } else {
            return this._unreadTextNos.length + 1;
          }
        },
        
        moveNext: function() {
          // Algorithm:
          // 
          // We use a stack to store the parts of the thread we don't
          // visit this time. Because we are not traversing the entire
          // tree at this time, we need to remember texts (branches)
          // further up in the tree, so we know where to continue when
          // the current branch ends.
          // 
          // If there are textNos on the stack: pop to get the new textNo.
          // 
          // Else: find new thread start by selecting the unread textNo
          // with lowest text number.
          // 
          // For the new text, push all unread comments onto the stack, in
          // reverse order.
          
          var nextTextNo = null;
          if (this._currentThreadStack.length > 0) {
            // We still have texts to read in this thread
            nextTextNo = this._currentThreadStack.pop();
            this._unreadTextNos = _.without(this._unreadTextNos, nextTextNo);
            this._unreadTextNos.sort(); // todo: do we really need to sort it here?
            $log.log("UnreadQueue:moveNext() - pop:ed " + nextTextNo + " from stack.")
          } else {
            // No more textNos in this thread, find new thread
            
            if (this._unreadTextNos.length > 0) {
              // We have unread texts, find new thread start by taking the
              // lowest text number.
              // Since this._unreadTextNos is sorted, we just shift.
              nextTextNo = this._unreadTextNos.shift();
              $log.log("UnreadQueue:moveNext() - found new thread in " + nextTextNo);
            } else {
              // No unread texts
              nextTextNo = null;
              $log.log("UnreadQueue:moveNext() - no unread textNos.")
            }
          }
          
          if (nextTextNo == null) {
            // Nothing to read, set currentTextNo to null
            this._currentTextNo = null;
          } else {
            // Start fetching the new current text, and when we have
            // fetched the text: Push all comments onto the stack, in
            // reverse order.
            
            this._currentTextNo = nextTextNo;
            var self = this;
            textsService.getText(nextTextNo).then(
              function(response) {
                var comments = _.clone(response.data.comment_in_list);
                if (comments) {
                  comments.reverse();
                  _.each(comments, function(comment) {
                    self._currentThreadStack.push(comment.text_no);
                  });
                }

                // Simple (stupid) prefetch of texts on the thread
                // stack, we wait for the fetch so we can consider the
                // new text's comments. ("last" because we pop from
                // the end of the array)
                _.each(_.last(self._currentThreadStack, self._prefetchCount),
                       function(textNo) {
                         //$log.log("UnreadQueue:moveNext() - prefetching comment " + textNo);
                         // We don't use the text here, instead we
                         // rely on the text to be stored in the
                         // cache. If there is no cache: this will
                         // make things even slower!
                         textsService.getText(textNo);
                       });
                
              });
          }
          
          // Simple (stupid) prefetch of the texts with low text
          // numbers ("thread starts"), no need to wait for fetching
          // of the new text.
          _.each(_.first(this._unreadTextNos, this._prefetchCount), function(textNo) {
            //$log.log("UnreadQueue:moveNext() - prefetching thread start " + textNo);
            // We don't use the text here, instead we rely on the text
            // to be stored in the cache. If there is no cache: this
            // will make things even slower!
            textsService.getText(textNo);
          });
        }
      });
      
      return {
        createReader: function(unreadQueue) {
          return new Reader(unreadQueue);
        },
        
        createUnreadQueue: function(textNos) {
          var unreadQueue = new UnreadQueue();
          if (textNos) {
            unreadQueue.enqueue(textNos);
          }
          return unreadQueue;
        }
      };
    }
  ]);
