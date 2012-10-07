// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', ['jskom.settings', 'jskom.connections']).
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
          // TODO: Implement a real re-formatter of text/x-kom-basic.
          // Replacing two line-breaks with <p> doesn't work very well
          // because people use line-breaks to format text, not only
          // to wrap long lines.
          
          //return htmlStr.replace(/(\r?\n|\r){2}/g, "<p />");
          return htmlStr.replace(/\r?\n|\r/g, "<br/>");
        },
        
        linkifyUrls: function(htmlStr) {
          var replacer = function(match, p1) {
            return '<a target="_blank" href="' + encodeURI(p1) + '">' + p1 + '</a>';
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
      var messages = [];
      
      var clearMessages = function(keepShowAfterUrlChange) {
        var newMessages = [];
        if (keepShowAfterUrlChange) {
          newMessages = _.filter(messages, function(msg) {
            return msg.showAfterUrlChange;
          });
          _.each(newMessages, function(msg) {
          msg.showAfterUrlChange = false;
          });
        }
        messages = newMessages;
      };
      
      $rootScope.$on('$routeChangeSuccess', function() {
        clearMessages(true);
      });
      
      return {
        newMessage: function(level, heading, text, showAfterUrlChange) {
          return {
            level: level,
            heading: heading,
            text: text,
            showAfterUrlChange: showAfterUrlChange
          };
        },
        
        showMessage: function(level, heading, text, showAfterUrlChange) {
          return this.show(this.newMessage(level, heading, text, showAfterUrlChange));
        },
        
        show: function(message) {
          messages.push(message);
        },
        
        getMessages: function() {
          return messages;
        },
        
        clearAll: function(keepShowAfterUrlChange) {
          clearMessages(keepShowAfterUrlChange);
        },
      };
    }
  ]).
  factory('sessionsService', [
    '$rootScope', '$log', '$q',
    'messagesService', 'jskomName', 'jskomVersion', 'httpkomConnectionHeader',
    function($rootScope, $log, $q,
             messagesService, jskomName, jskomVersion, httpkomConnectionHeader) {
      var clientInfo = { name: jskomName, version: jskomVersion };
      
      return {
        createSession: function(conn) {
          var request = { method: 'post', url: '/sessions/', data: { client: clientInfo } };
          return conn.http(request).then(
            function(response) {
              conn.httpkomId = response.data.connection_id;
              // Remove the connection_id from the session. It's only
              // there as a work-around for not being able to read the
              // Httpkom-Connection header on all browsers.
              var session = _.clone(response.data);
              delete session.connection_id;
              conn.session = session;
              conn.clearAllCaches();
              $rootScope.$broadcast('jskom:connection:changed', conn);
              return response;
            });
        },
        
        deleteSession: function(conn, sessionNo) {
          // sessionNo == 0 means current session
          return conn.http({ method: 'delete', url: '/sessions/' + sessionNo }).then(
            function(response) {
              // Check if we deleted our own session
              if (sessionNo == 0 || sessionNo == conn.session.session_no) {
                conn.httpkomId = null;
                conn.session = null;
                conn.clearAllCaches();
                $rootScope.$broadcast('jskom:connection:changed', conn);
              }
              return response;
            });
        },
        
        
        // Methods on current session:
        
        whoAmI: function(conn) {
          return conn.http({ method: 'get', url: '/sessions/current/who-am-i'});
        },
        
        newPerson: function(persNo) {
          persNo = persNo || null;
          return { pers_name: '', pers_no: persNo, passwd: '' };
        },
        
        login: function(conn, person) {
          var request = { method: 'post', url: '/sessions/current/login',
                          data: { person: person } };
          return conn.http(request).then(
            function(response) {
              conn.session = response.data;
              conn.clearAllCaches();
              $rootScope.$broadcast('jskom:connection:changed', conn);
              return response;
            });
        },
        
        logout: function(conn) {
          return conn.http({ method: 'post', url: '/sessions/current/logout' }).then(
            function(response) {
              conn.session.person = null;
              conn.clearAllCaches();
              $rootScope.$broadcast('jskom:connection:changed', conn);
              return response;
            });
        },
        
        changeConference: function(conn, confNo) {
          var request = { method: 'post', url: '/sessions/current/working-conference',
                          data: { conf_no: parseInt(confNo) }};
          return conn.http(request);
        }
      };
    }
  ]).
  factory('textsService', [
    '$log', '$q',
    function($log, $q) {
      var enhanceText = function(conn, text) {
        var mimeType = Mimeparse.parseMimeType(text.content_type);
        text.jskomBodyType = mimeType[0];
        
        if (text.jskomBodyType == 'image') {
          text.jskomImageUrl = conn.urlFor('/texts/' + text.text_no + '/body', true);
        } else {
          text.jskomImageUrl = null;
        }
        
        if (text.aux_items) {
          text.jskomFastReplies = _.filter(text.aux_items, function(aux_item) {
            return aux_item.tag == 'fast-reply';
          });
        } else {
          text.jskomFastReplies = null;
        }
        
        return text;
      };
      
      return {
        getText: function(conn, textNo) {
          textNo = textNo.toString();
          var cachedResp = conn.textsCache.get(textNo);
          
          if (cachedResp) {
            //$log.log("textsService - getText(" + textNo + ") - cached");
            return cachedResp;
          } else {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            conn.http({ method: 'get', url: '/texts/' + textNo }).then(
              function(response) {
                $log.log("textsService - getText(" + textNo + ") - success");
                response.data = enhanceText(conn, response.data);
                deferred.resolve(response);
              },
              function(response) {
                $log.log("textsService - getText(" + textNo + ") - error");
                conn.textsCache.remove(textNo);
                deferred.reject(response);
              });
            
            conn.textsCache.put(textNo, promise);
            return promise;
          }
        },
        
        createText: function(conn, text) {
          return conn.http({ method: 'post', url: '/texts/', data: text }).then(
            function(response) {
              _.each(text.comment_to_list, function(commentedText) {
                // Remove commented texts from the cache so we can
                // fetch them with the new text in their
                // comment_in_list.
                conn.textsCache.remove(commentedText.text_no.toString());
              });
              return response;
            });
        }
      };
    }
  ]).
  factory('conferencesService', [
    '$log',
    function($log) {
      return {
        lookupConferences: function(conn, name, wantPers, wantConfs) {
          return conn.http({ method: 'get', url: '/conferences/',
                             params: {
                               "name": name,
                               "want-pers": wantPers,
                               "want-confs": wantConfs
                             } });
        },
        
        getConference: function(conn, confNo, micro) {
          if (arguments.length < 2) {
            micro = true;
          }
          return conn.http({ method: 'get', url: '/conferences/' + confNo,
                             params: { "micro": micro } });
        },
      };
    }
  ]).
  factory('personsService', [
    '$log',
    function($log) {
      return {
        newPerson: function() {
          return { name: '', passwd: '' };
        },
        
        createPerson: function(conn, person) {
          var data = { name: person.name, passwd: person.passwd };
          return conn.http({ method: 'post', url: '/persons/', data: data });
        }
      };
    }
  ]).
  factory('membershipsService', [
    '$log', '$q', 'sessionsService',
    function($log, $q, sessionsService) {
      var createResolvedPromiseFor = function(resolveArg) {
        var deferred = $q.defer();
        var promise = deferred.promise;
        deferred.resolve(resolveArg);
        return promise;
      };
      
      var cacheKeyForUnread = function(persNo) {
        return persNo + ":unread";
      };
      
      var cacheKeyForConf = function(persNo, confNo) {
        return persNo + ":" + confNo;
      };
      
      var clearCacheForPersonAndConf = function(conn, persNo, confNo) {
        var confKey = cacheKeyForConf(persNo, confNo);
        conn.membershipsCache.remove(confKey);
        
        // also remove unread cache
        var unreadKey = cacheKeyForUnread(persNo);
        conn.membershipsCache.remove(unreadKey);
      };
      
      var saveMembershipsInCache = function(conn, persNo, memberships) {
        _.each(memberships, function(membership) {
          var cacheKey = cacheKeyForConf(persNo, membership.conference.conf_no);
          var promise = createResolvedPromiseFor(membership);
          conn.membershipsCache.put(cacheKey, promise);
        });
      };
      
      return {
        clearCacheForConf: function(conn, confNo) {
          var confKey = cacheKeyForConf(conn.getPersNo(), confNo);
          conn.membershipsCache.remove(confKey);
        },
        
        setNumberOfUnreadTexts: function(conn, confNo, noOfUnread) {
          var data = { no_of_unread: parseInt(noOfUnread) };
          return conn.http({ method: 'post', url: '/persons/current/memberships/' + confNo,
                             data: data }).
            then(function(response) {
              clearCacheForPersonAndConf(conn, conn.getPersNo(), confNo);
              return response;
            });
        },
        
        addMembership: function(conn, confNo) {
          return this.addMembershipForPerson(conn, conn.getPersNo());
        },
        
        addMembershipForPerson: function(conn, persNo, confNo) {
          var priority = 100;
          // todo: this httpkom call should take priority in the body, not as query param.
          return conn.http({ method: 'put', url: '/persons/' + persNo + '/memberships/' + confNo,
                             params: { "priority": parseInt(priority) } }).
            then(function(response) {
              clearCacheForPersonAndConf(conn, conn.getPersNo(), confNo);
              return response;
            });
        },
        
        deleteMembership: function(conn, confNo) {
          return this.deleteMembershipForPerson(conn, conn.getPersNo(), confNo);
        },
        
        deleteMembershipForPerson: function(conn, persNo, confNo) {
          return conn.http({ method: 'delete',
                             url: '/persons/' + persNo + '/memberships/' + confNo }).
            then(function(response) {
              clearCacheForPersonAndConf(conn, conn.getPersNo(), confNo);
              return response;
            });
        },
        
        getMembership: function(conn, confNo, options) {
          return this.getMembershipForPerson(conn, conn.getPersNo(), confNo, options);
        },
        
        getMembershipForPerson: function(conn, persNo, confNo, options) {
          options = options || { cache: true };
          
          var cacheKey = cacheKeyForConf(persNo, confNo);
          var cachedResp = conn.membershipsCache.get(cacheKey);
          
          if (options.cache && cachedResp) {
            $log.log('membershipsService - getMembership(' + confNo + ') - cached');
            return cachedResp;
          } else {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            conn.http({ method: 'get', url: '/persons/' + persNo + '/memberships/' + confNo,
                        params: { "want-unread": true } }).
              then(
                function(response) {
                  $log.log('membershipsService - getMembership(' + confNo + ') - success');
                  deferred.resolve(response.data);
                },
                function(response) {
                  $log.log('membershipsService - getMembership(' + confNo + ') - error');
                  conn.membershipsCache.remove(cacheKey);
                  deferred.reject(response);
                });
            
            conn.membershipsCache.put(cacheKey, promise);
            return promise;
          }
        },
        
        getUnreadMemberships: function(conn, options) {
          return this.getUnreadMembershipsForPerson(conn, conn.getPersNo(), options);
        },
        
        getUnreadMembershipsForPerson: function(conn, persNo, options) {
          var deferred = $q.defer();
          var promise = deferred.promise;
          
          var self = this;
          this.getUnreadConfNosForPerson(conn, persNo, options).then(
            function(unreadConfNos) {
              var promises = _.map(unreadConfNos, function(confNo) {
                return self.getMembershipForPerson(conn, persNo, confNo, options);
              });
              $q.all(promises).then(
                function(memberships) {
                  deferred.resolve(_.filter(memberships, function(membership) {
                    // Filter out those with no unread. This can happen
                    // because of caching.
                    return membership.no_of_unread > 0;
                  }));
                },
                function(rejection) {
                  deferred.reject(rejection);
                });
            },
            function(response) {
              deferred.reject(response);
            });
          
          return promise;
        },
        
        getUnreadConfNos: function(conn, options) {
          return this.getUnreadConfNosForPerson(conn, conn.getPersNo(), options);
        },
        
        getUnreadConfNosForPerson: function(conn, persNo, options) {
          options = options || { cache: true };
          
          var cacheKey = cacheKeyForUnread(persNo);
          var cachedResp = conn.membershipsCache.get(cacheKey);
          
          if (options.cache && cachedResp) {
            $log.log('membershipsService - getUnreadMemberships() - cached');
            return cachedResp;
          } else {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            conn.http({ method: 'get', url: '/persons/' + persNo + '/memberships/',
                        params: { "unread": true, "want-unread": true } }).
              then(
                function(response) {
                  $log.log('membershipsService - getUnreadMemberships() - success');
                  saveMembershipsInCache(conn, persNo, response.data.memberships);
                  var unreadConfNos = _.map(response.data.memberships,
                                            function(membership) {
                                              return membership.conference.conf_no;
                                            });
                  deferred.resolve(unreadConfNos);
                },
                function(response) {
                  $log.log('membershipsService - getUnreadMemberships() - error');
                  conn.membershipsCache.remove(cacheKey);
                  deferred.reject(response);
                });
            
            conn.membershipsCache.put(cacheKey, promise);
            return promise;
          }
        },
      };
    }
  ]).
  factory('readMarkingsService', [
    'membershipsService',
    function(membershipsService) {
      var clearCacheForRecipients = function(conn, text) {
        if (text) {
          // Clear membership cache because marking texts as read/unread
          // will make the data invalid.
          _.each(text.recipient_list, function(recipient) {
            membershipsService.clearCacheForConf(conn, recipient.conf_no);
          });
        }
      };
      
      return {
        createGlobalReadMarking: function(conn, text) {
          var request = { method: 'put', url: '/texts/' + text.text_no + '/read-marking' };
          return conn.http(request).then(
            function(response) {
              clearCacheForRecipients(conn, text);
              return response;
            });
        },
        
        deleteGlobalReadMarking: function(conn, text) {
          var request = { method: 'delete', url: '/texts/' + text.text_no + '/read-marking' };
          return conn.http(request).then(
            function(response) {
              clearCacheForRecipients(conn, text);
              return response;
            });
        },
      };
    }
  ]).
  factory('readerFactory', [
    '$log', 'textsService', 'readMarkingsService', 'messagesService',
    function($log, textsService, readMarkingsService, messagesService) {
      var markAsRead = function(conn, text) {
        readMarkingsService.createGlobalReadMarking(conn, text).then(
          function(response) {
            $log.log("readerFactory - markAsRead(" + text.text_no + ") - success");
            text._is_unread = false;
          },
          function(response) {
            $log.log("readerFactory - markAsRead(" + text.text_no + ") - error");
            messagesService.showMessage('error', 'Failed to mark text as read.', response.data);
          });
      };
      
      var Reader = function(conn, unreadQueue) {
        this.conn = conn;
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
          if (this.hasPending()) {
            return textsService.getText(this.conn, this._pending.shift()).then(
              function(response) {
                return response.data;
              });
            
          } else if (this.hasUnread()) {
            var self = this;
            return textsService.getText(this.conn, this._unreadQueue.dequeue()).then(
              function(response) {
                response.data._is_unread = true;
                markAsRead(self.conn, response.data);
                return response.data;
              });
          } else {
            return null;
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
      
      
      
      var UnreadQueue = function(conn) {
        this.conn = conn;
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
          
          var self = this;
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
            textsService.getText(this.conn, nextTextNo).then(
              function(response) {
                var comments = _.map(response.data.comment_in_list, function(text) {
                  return text.text_no;
                });
                if (comments) {
                  // We filter instead of doing intersection because
                  // we need to be sure that we preserve the order of
                  // the comments.
                  var unreadComments = _.filter(comments, function(textNo) {
                    return _.include(self._unreadTextNos, textNo)
                  });
                  unreadComments.reverse();
                  _.each(unreadComments, function(textNo) {
                    self._currentThreadStack.push(textNo);
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
                         textsService.getText(self.conn, textNo);
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
            textsService.getText(self.conn, textNo);
          });
        }
      });
      
      return {
        createReader: function(conn, unreadQueue) {
          return new Reader(conn, unreadQueue);
        },
        
        createUnreadQueue: function(conn, textNos) {
          var unreadQueue = new UnreadQueue(conn);
          if (textNos) {
            unreadQueue.enqueue(textNos);
          }
          return unreadQueue;
        }
      };
    }
  ]);
