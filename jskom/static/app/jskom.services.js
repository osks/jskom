// Copyright (C) 2012 Oskar Skoog.

'use strict';

// All httpkom services should resolve with response.data, or
// response.data.<list-property> if the list is wrapped. They still
// reject with the respones, but we should introduce a standardized
// error message instead.

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
      // From: https://github.com/wycats/handlebars.js/blob/master/lib/handlebars/utils.js
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
      var lyskomTextLinkRegexp = /<text\s+([0-9]+)\s*(?::[^<>]*)?\s*>/gi;
      var lyskomConfLinkRegexp = /<(?:person|möte)\s+([0-9]+)\s*(?::[^<>]*)?\s*>/gi;
      var lyskomUrlLinkRegexp = /<url:?\s*([^\s>]+)\s*>/gi;
      
      var lineBreakRegexp = /\r?\n|\r/g;
      
      var replaceMultiple = function(unescapedStr, replacers) {
        var i = 0;
        var replace = function(str, regexp, replaceFunc, tmpObj) {
          str = str.replace(regexp, function(match) {
            var holder = '#@@' + i + '@@%';
            tmpObj[holder] = replaceFunc.apply(null, arguments);
            ++i;
            return holder;
          });
          return str;
        };
        
        var tmp = {};
        _.each(replacers, function(replacer) {
          unescapedStr = replace(unescapedStr, replacer.regexp, replacer.func, tmp);
        });
        
        var escapedStr = escapeExpression(unescapedStr);
        _.each(tmp, function(value, key) {
          escapedStr = escapedStr.replace(key, value);
        });
        
        return escapedStr;
      };
      
      return {
        formatBody: function(rawBody) {
          var escaped = replaceMultiple(rawBody, [
            {
              regexp: lyskomUrlLinkRegexp,
              func: function(match, p1) {
                return '<a target="_blank" href="' + p1 + '">' + escapeExpression(match) +
                  '</a>';
              }
            },
            {
              regexp: urlRegexp,
              func: function(match) {
                return '<a target="_blank" href="' + match + '">' + escapeExpression(match) +
                  '</a>';
              }
            },
            {
              regexp: lyskomTextLinkRegexp,
              func: function(match, p1) {
                return '<jskom:a text-no="' + p1 + '">' + escapeExpression(match) + '</jskom:a>';
              }
            },
            {
              regexp: lyskomConfLinkRegexp,
              func: function(match, p1) {
                return '<a href="/conferences/' + p1 + '">' + escapeExpression(match) + '</a>';
              }
            },
            {
              regexp: lyskomTextNumberRegexp,
              func: function(match, p1) {
                return '<jskom:a text-no="' + match + '">' + escapeExpression(match) +
                  '</jskom:a>';
              }
            },
            {
              regexp: lineBreakRegexp,
              func: function(match, p1) {
                return '<br/>';
              }
            },
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
  factory('pageTitleService', [
    '$window',
    function($window) {
      return {
        set: function(title) {
          if (title && title.length > 0) {
            $window.document.title = title + " - jskom";
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
          return conn.http(request, false, false).then(
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
              conn.broadcast('jskom:session:created', session);
              return session;
            });
        },
        
        deleteSession: function(conn, sessionNo) {
          // sessionNo == 0 means current session
          return conn.http({ method: 'delete', url: '/sessions/' + sessionNo }, true, false).then(
            function(response) {
              // Check if we deleted our own session
              if (sessionNo == 0 || sessionNo == conn.session.session_no) {
                conn.httpkomId = null;
                conn.session = null;
                conn.clearAllCaches();
                $rootScope.$broadcast('jskom:connection:changed', conn);
                conn.broadcast('jskom:session:deleted');
              }
              return response.data;
            });
        },
        
        
        // Methods on current session:
        
        userIsActive: function(conn) {
          return conn.http({ method: 'post', url: '/sessions/current/active'}, true, true);
        },
        
        newPerson: function(persNo) {
          persNo = persNo || null;
          return { pers_name: '', pers_no: persNo, passwd: '' };
        },
        
        login: function(conn, person) {
          var self = this;
          var request = { method: 'post', url: '/sessions/current/login', data: person };
          return conn.http(request, true, false).then(
            function(response) {
              conn.session.person = response.data;
              conn.clearAllCaches();
              conn.userIsActive();
              $rootScope.$broadcast('jskom:connection:changed', conn);
              conn.broadcast('jskom:session:changed');
              return response.data;
            });
        },
        
        logout: function(conn) {
          return conn.http({ method: 'post', url: '/sessions/current/logout' }, true, true).then(
            function(response) {
              conn.session.person = null;
              conn.clearAllCaches();
              $rootScope.$broadcast('jskom:connection:changed', conn);
              conn.broadcast('jskom:session:changed');
              return response.data;
            });
        },
        
        changeConference: function(conn, confNo) {
          confNo = parseInt(confNo);
          var request = { method: 'post', url: '/sessions/current/working-conference',
                          data: { conf_no: confNo }};
          var previousConfNo = conn.currentConferenceNo;
          conn.currentConferenceNo = confNo; // update pre-request 
          return conn.http(request, true, true).then(
            function (response) {
              $log.log("sessionsService - changeConference(" + confNo + ")");
              // Change conference triggers the lyskom server to
              // update last-time-read for the previous conference.
              conn.currentConferenceNo = confNo; // make sure we have the correct conf
              if (previousConfNo !== 0) {
                conn.broadcast('jskom:membership:changed:', previousConfNo);
              }
            },
            function (response) {
              conn.currentConferenceNo = previousConfNo; // revert if request failed
              return $q.reject(response);
            });
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
            
            conn.http({ method: 'get', url: '/texts/' + textNo }, true, true).then(
              function(response) {
                $log.log("textsService - getText(" + textNo + ") - success");
                response.data = enhanceText(conn, response.data);
                conn.broadcast('jskom:text:fetched', response.data);
                deferred.resolve(response.data);
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
        
        getLastCreatedTextsInConference: function(conn, confNo) {
          return conn.http({ method: 'get', url: '/conferences/' + confNo + '/texts/' },
                           true, true).
            then(function(response) {
              $log.log("textsService - getLastCreatedTextsInConference(" + confNo + ") - success");
              response.data = response.data.texts;
              // TODO: If we get full texts here, we could cache them.
              // 
              // An alternative would be to only get the text numbers
              // first, and then be able to fetch some texts from
              // cache and some from the server. For that we need an
              // API call for fetching several texts from a list of
              // text numbers (which would be nice to have anyway, for
              // example in Reader prefetch). Then we only have to do
              // at most 2 request even without anything in the cache.
              
              _.each(response.data, function (text) {
                // not sure if we want to do this. the texts here are
                // not "full" texts right now.
                conn.broadcast('jskom:text:fetched', text);
              });
              return response.data;
            });
        },
        
        createText: function(conn, text) {
          var self = this;
          return conn.http({ method: 'post', url: '/texts/', data: text }, true, true).then(
            function(response) {
              _.each(text.comment_to_list, function(commentedText) {
                // Remove commented texts from the cache so we can
                // fetch them with the new text in their
                // comment_in_list.
                conn.textsCache.remove(commentedText.text_no.toString());
              });
              conn.broadcast('jskom:text:created', response.data.text_no, text.recipient_list);
              return response.data;
            });
        },
        
        // Is this a good way? Not sure if we want this. We should use
        // events instead.
        updateTextInCache: function(conn, textNo, textUpdateFunction) {
          // The cache stores promises
          var cachedResp = conn.textsCache.get(textNo.toString());
          if (cachedResp != null) {
            cachedResp.then(function(cachedText) {
              if (cachedText != null) {
                textUpdateFunction(cachedText);
              }
            });
          }
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
                             } }, true, false).
            then(
              function (response) {
                return response.data.conferences;
              });
        },
        
        getConference: function(conn, confNo, options) {
          options = _.isUndefined(options) ? {} : options;
          _.defaults(options, { micro: false });
          
          return conn.http({ method: 'get', url: '/conferences/' + confNo,
                             params: { "micro": options.micro } }, true, true).
            then(
              function (response) {
                return response.data;
              });
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
          return conn.http({ method: 'post', url: '/persons/', data: data }, true, false).then(
            function (response) {
              return response.data;
            });
        }
      };
    }
  ]).
  factory('membershipsService', [
    '$log', '$q',
    function($log, $q) {
      return {
        setNumberOfUnreadTexts: function(conn, confNo, noOfUnread) {
          var data = { no_of_unread: parseInt(noOfUnread) };
          return conn.http({ method: 'post',
                             url: '/persons/current/memberships/' + confNo + '/unread',
                             data: data }, true, true).
            then(function(response) {
              conn.broadcast('jskom:membership:changed', confNo);
              conn.broadcast('jskom:membershipUnread:changed', confNo);
            });
        },
        
        addMembership: function(conn, confNo) {
          return this.addMembershipForPerson(conn, conn.getPersNo(), confNo);
        },
        
        addMembershipForPerson: function(conn, persNo, confNo) {
          var data = { priority: 100 };
          return conn.http({ method: 'put', url: '/persons/' + persNo + '/memberships/' + confNo,
                             data: data }, true, true).
            then(function(response) {
              // TODO: event so we can update membershiplist
            });
        },
        
        deleteMembership: function(conn, confNo) {
          return this.deleteMembershipForPerson(conn, conn.getPersNo(), confNo);
        },
        
        deleteMembershipForPerson: function(conn, persNo, confNo) {
          return conn.http({ method: 'delete',
                             url: '/persons/' + persNo + '/memberships/' + confNo }, true, true);
            then(function(response) {
              // TODO: event so we can update membershiplist
            });
        },
        
        getMembership: function(conn, confNo) {
          return this.getMembershipForPerson(conn, conn.getPersNo(), confNo);
        },
        
        getMembershipForPerson: function(conn, persNo, confNo) {
          return conn.http({ method: 'get', url: '/persons/' + persNo + '/memberships/' + confNo },
                           true, true).
            then(
              function (response) {
                $log.log('membershipsService - getMembershipForPerson(' +
                         persNo + ', ' + confNo + ') - success');
                return response.data;
              },
              function (response) {
                $log.log('membershipsService - getMembershipForPerson(' +
                         persNo + ', ' + confNo + ') - error');
                return $q.reject(response);
              });
        },
        
        getMemberships: function(conn, options) {
          return this.getMembershipsForPerson(conn, conn.getPersNo(), options);
        },
        
        getMembershipsForPerson: function(conn, persNo, options) {
          options = _.isUndefined(options) ? { unread: false } : options;
          
          var params = { "unread": options.unread };
          if (!_.isUndefined(options.first)) {
            params["first"] = options.first;
          }
          if (!_.isUndefined(options.noOfMemberships)) {
            params["no-of-memberships"] = options.noOfMemberships;
          }
          
          var logPrefix = 'membershipsService - getMembershipsForPerson(' + persNo +
            ', ' + angular.toJson(options) + ') - ';
          return conn.http({ method: 'get', url: '/persons/' + persNo + '/memberships/',
                             params: params }, true, true).
            then(
              function(response) {
                $log.log(logPrefix + 'success');
                return response.data;
              },
              function(response) {
                $log.log(logPrefix + 'error');
                return $q.reject(response);
              });
        },
        
        getMembershipUnread: function(conn, confNo) {
          return this.getMembershipUnreadForPerson(conn, conn.getPersNo(), confNo);
        },
        
        getMembershipUnreadForPerson: function(conn, persNo, confNo) {
          var logPrefix = 'membershipsService - getMembershipUnreadForPerson(' +
            persNo + ', ' + confNo + ') - ';
          
          return conn.http({ method: 'get',
                             url: '/persons/' + persNo + '/memberships/' + confNo + '/unread' },
                           true, true).
            then(
              function(response) {
                $log.log(logPrefix + 'success');
                return response.data;
              },
              function(response) {
                $log.log(logPrefix + 'error');
                return $q.reject(response);
              });
        },
        
        getMembershipUnreads: function(conn) {
          return this.getMembershipUnreadsForPerson(conn, conn.getPersNo());
        },
        
        getMembershipUnreadsForPerson: function(conn, persNo) {
          var logPrefix = 'membershipsService - getMembershipUnreadsForPerson(' + persNo + ') - ';
          return conn.http({ method: 'get', url: '/persons/' + persNo + '/memberships/unread/' },
                           true, true).
            then(
              function(response) {
                $log.log(logPrefix + 'success');
                return response.data.list;
              },
              function(response) {
                $log.log(logPrefix + 'error');
                return $q.reject(response);
              });
        },
      };
    }
  ]).
  factory('marksService', [
    '$log', '$q', 'textsService',
    function($log, $q, textsService) {
      // We only cache the list of marks in the marksCache, so we just
      // use this constant as cache key.
      var cacheKey = "marks";
      
      function updateMarksCache(conn, updateFunction) {
        var cachedResp = conn.marksCache.get(cacheKey);
        if (cachedResp != null) {
          cachedResp.then(function(marks) {
            updateFunction(marks);
          });
        }
      }
      
      return {
        getMarks: function(conn) {
          var cachedResp = conn.marksCache.get(cacheKey);
          
          if (cachedResp) {
            $log.log("marksService - getMarks() - cached");
            return cachedResp;
          } else {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            conn.http({ method: 'get', url: '/texts/marks/'}, true, true).then(
              function(response) {
                $log.log("marksService - getMarks() - success");
                deferred.resolve(response.data.marks);
              },
              function(response) {
                $log.log("marksService - getMarks() - error");
                conn.marksCache.remove(cacheKey);
                deferred.reject(response);
              });
            
            conn.marksCache.put(cacheKey, promise);
            return promise;
          }
        },
        
        createMark: function(conn, textNo, type) {
          var request = { method: 'put', url: '/texts/' + textNo + '/mark', data: { type: type } };
          return conn.http(request, true, true).then(
            function() {
              // Update cached marks
              updateMarksCache(conn, function(marks) {
                var existing = _.find(marks, function(m) {
                  return m.text_no === textNo;
                });
                if (existing == null) {
                  marks.push({ text_no: textNo, type: type });
                } else {
                  existing.type = type;
                }
              });
              
              // Update cached text
              textsService.updateTextInCache(conn, textNo, function(text) {
                if (text.no_of_marks != null) {
                  text.no_of_marks += 1;
                }
              });
            });
        },
        
        deleteMark: function(conn, textNo) {
          var request = { method: 'delete', url: '/texts/' + textNo + '/mark' };
          return conn.http(request, true, true).then(
            function() {
              // Update cached marks
              updateMarksCache(conn, function(marks) {
                var existing = _.find(marks, function(m) {
                  return m.text_no === textNo;
                });
                if (existing != null) {
                  var idx = marks.indexOf(existing);
                  // Since we just found it, it should be there, but we check the index anyway
                  if (idx !== -1) {
                    marks.splice(idx, 1);
                  }
                }
              });
              
              // Update text in cache (better than only invalidating)
              textsService.updateTextInCache(conn, textNo, function(text) {
                if (text.no_of_marks != null) {
                  text.no_of_marks -= 1;
                }
              });
            });
        }
      };
    }
  ]).
  factory('readMarkingsService', [
    '$log', '$rootScope', 'membershipsService',
    function($log, $rootScope, membershipsService) {
      return {
        createGlobalReadMarking: function(conn, text) {
          var request = { method: 'put', url: '/texts/' + text.text_no + '/read-marking' };
          return conn.http(request, true, true).then(
            function(response) {
              conn.broadcast('jskom:readMarking:created', text);
              return response.data;
            });
        },
        
        deleteGlobalReadMarking: function(conn, text) {
          var request = { method: 'delete', url: '/texts/' + text.text_no + '/read-marking' };
          return conn.http(request, true, true).then(
            function(response) {
              conn.broadcast('jskom:readMarking:deleted', text);
              return response.data;
            });
        },
      };
    }
  ]).
  factory('readerFactory', [
    '$log', '$q', 'textsService',
    function($log, $q, textsService) {
      return {
        createReader: function(conn) {
          return new jskom.Reader($log, $q, textsService, conn);
        }
      };
    }
  ]).
  factory('membershipListFactory', [
    function() {
      return {
        create: function () {
          return new jskom.MembershipList();
        }
      };
    }
  ]).
  factory('membershipListService', [
    '$log', '$q',
    function($log, $q) {
      return {
        getMembershipList: function (conn) {
          return conn.membershipListHandler.getMembershipList();
        },
        
        refreshUnread: function (conn) {
          return conn.membershipListHandler.refreshUnread();
        }
      };
    }    
  ]).
  factory('membershipListHandlerFactory', [
    '$log', '$q', '$timeout', '$rootScope', 'membershipsService',
    function($log, $q, $timeout, $rootScope, membershipsService) {
      // The MembershipListHandler regularly polls the server for any
      // new unread texts/memberships and upates the membership
      // list. The handling parts include updating the list of
      // memberships with what texts are unread and how many unread
      // there are.
      function MembershipListHandler(conn, membershipList) {
        this._conn = conn;
        this._membershipList = membershipList;
        this._logPrefix = "MembershipListHandler - ";
        
        this._initializePromise = null;
        
        this._refreshIntervalSeconds = 2*60;
        this._autoRefreshPromise = null;
      };
      
      _.extend(MembershipListHandler.prototype, {
        _initialize: function () {
          if (this._initializePromise == null) {
            var p1 = this._fetchUnreadMemberships();
            var p2 = this._fetchMembershipUnreads();
            var self = this;
            // The returned promise will be resolved when the unread
            // have been fetched, not when all memberships have been
            // fetched.
            this._initializePromise = $q.all([ p1, p2 ]).then(
              function () {
                // When we have fetched both the unread memberships and
                // the membershipUnreads, then we fetch the full membership list.
                self._registerEvents();
                self._fetchAllMemberships();
                self.enableAutoRefresh();
                $log.log(self._logPrefix + "initialize() - success");
              },
              function () {
                // if the initialize fails, remove the stored promise.
                $log.log(self._logPrefix + "initialize() - error");
                self._initializePromise = null;
                return $q.reject();
              });
          }
          return this._initializePromise;
        },
        
        _registerEvents : function () {
          var conn = this._conn;
          var self = this;
          conn.on('jskom:session:created', function ($event) {
            $log.log(self._logPrefix + 'on(jskom:session:created)');
            self.reset();
          });
          
          conn.on('jskom:session:changed', function ($event) {
            $log.log(self._logPrefix + 'on(jskom:session:changed)');
            self.reset();
          });
          
          conn.on('jskom:session:deleted', function ($event) {
            $log.log(self._logPrefix + 'on(jskom:session:deleted)');
            self.reset();
          });
          
          conn.on('jskom:readMarking:created', function ($event, text) {
            $log.log(self._logPrefix + 'on(jskom:readMarking:created)');
            var recipientConfNos = _.map(text.recipient_list, function (r) {
              return r.recpt.conf_no;
            });
            self._membershipList.markTextAsRead(text.text_no, recipientConfNos);
          });
          
          conn.on('jskom:readMarking:deleted', function ($event, text) {
            $log.log(self._logPrefix + 'on(jskom:readMarking:deleted)');
            var recipientConfNos = _.map(text.recipient_list, function (r) {
              return r.recpt.conf_no;
            });
            self._membershipList.markTextAsUnread(text.text_no, recipientConfNos);
          });
          
          conn.on('jskom:membership:changed', function ($event, confNo) {
            $log.log(self._logPrefix + 'on(jskom:membership:changed)');
            self._fetchMembership(confNo);
          });

          conn.on('jskom:membershipUnread:changed', function ($event, confNo) {
            $log.log(self._logPrefix + 'on(jskom:membershipUnread:changed)');
            self._fetchMembershipUnread(confNo);
          });
          
          conn.on('jskom:text:created', function ($event, textNo, recipientList) {
            $log.log(self._logPrefix + 'on(jskom:text:created, ' + textNo + ')');
            var recipientConfNos = _.map(recipientList, function (r) {
              return r.recpt.conf_no;
            });
            self._membershipList.markTextAsUnread(textNo, recipientConfNos);
          });
          
          conn.on('jskom:text:fetched', function ($event, text) {
            $log.log(self._logPrefix + 'on(jskom:text:fetched, ' + text.text_no + ')');
            var recipientConfNos = _.map(text.recipient_list, function (r) {
              return r.recpt.conf_no;
            });
            text.jskomIsUnread = self._membershipList.isTextUnread(text.text_no, recipientConfNos);
          });
        },
        
        _fetchMembershipUnreads: function () {
          // TODO: Make sure we only have one of these requests active
          // at one time.
          
          var logp = this._logPrefix + "getMembershipUnreads() - ";
          var self = this;
          return membershipsService.getMembershipUnreads(this._conn).then(
            function (membershipUnreads) {
              $log.log(logp + "success");
              self._membershipList.setMembershipUnreads(membershipUnreads);
            },
            function (response) {
              $log.log(logp + "error");
              // TODO: can we do anything? should we show a message?
              return $q.reject();
            });
        },
        
        _fetchMembershipUnread: function (confNo) {
          var logp = this._logPrefix + "getMembershipUnread(" + confNo + ") - ";
          var self = this;
          return membershipsService.getMembershipUnread(this._conn, confNo).then(
            function (membershipUnread) {
              $log.log(logp + "success");
              self._membershipList.setMembershipUnread(membershipUnread);
            },
            function (response) {
              $log.log(logp + "error");
              // TODO: can we do anything? should we show a message?
              return $q.reject();
            });
        },
        
        _fetchUnreadMemberships: function () {
          // TODO: Make sure we only have one of these requests active
          // at one time.
          
          var options = { unread: true };
          var logp = this._logPrefix + "getMemberships(" + angular.toJson(options) + ") - ";
          var self = this;
          return membershipsService.getMemberships(this._conn, options).then(
            function (unreadMembershipList) {
              $log.log(logp + "success");
              self._membershipList.addMemberships(unreadMembershipList.memberships);
            },
            function (response) {
              $log.log(logp + "error");
              // TODO: can we do anything? should we show a message?
              return $q.reject();
            });
        },
        
        _fetchAllMemberships: function () {
          // TODO: Make sure we only have one of these requests active
          // at one time.
          this._fetchMemberships(0, 500, 1000);
        },
        
        _fetchMemberships: function (first, noOfMemberships, maxNoOfMemberships) {
          var logp = this._logPrefix + "getMemberships({ unread: false }) - ";
          var self = this;
          var options = { unread: false, first: first, noOfMemberships: noOfMemberships }
          return membershipsService.getMemberships(self._conn, options).then(
            function (membershipList) {
              $log.log(logp + "success");
              self._membershipList.addMemberships(membershipList.memberships);
              var nextFirst = first + noOfMemberships;
              if (membershipList.has_more && nextFirst < maxNoOfMemberships) {
                self._fetchMemberships(nextFirst, noOfMemberships, maxNoOfMemberships);
              }
            },
            function (response) {
              $log.log(logp + "error");
              // TODO: can we do anything? should we show a message?
              return $q.reject();
            });
        },
        
        _fetchMembership: function (confNo) {
          var logp = this._logPrefix + "getMemberships(" + confNo + ") - ";
          var self = this;
          return membershipsService.getMembership(this._conn, confNo).then(
            function (membership) {
              $log.log(logp + "success");
              self._membershipList.addMemberships([membership]);
            },
            function (response) {
              $log.log(logp + "error");
              // TODO: can we do anything? should we show a message?
              return $q.reject();
            });
        },
        
        reset: function () {
          this.disableAutoRefresh();
          this._membershipList.clear();
          this._initializePromise = null;
        },
        
        getMembershipList: function () {
          var self = this;
          return this._initialize().then(function () {
            return self._membershipList;
          });
        },

        _enableAutoRefresh: function () {
          $log.log(this._logPrefix + "enabling auto-refresh");
          var self = this;
          function scheduleReload() {
            self._autoRefreshPromise = $timeout(function() {
              self.refreshUnread().then(
                function() {
                  scheduleReload();
                },
                function() {
                  self.disableAutoRefresh();
                });
            }, self._refreshIntervalSeconds * 1000);
          }
          scheduleReload();
        },
        
        enableAutoRefresh: function () {
          var self = this;
          return this._initialize().then(function () {
            self._enableAutoRefresh();
          });
        },
        
        disableAutoRefresh: function () {
          if (this._autoRefreshPromise != null) {
            $log.log(this._logPrefix + "disabling auto-refresh");
            $timeout.cancel(this._autoRefreshPromise);
            this._autoRefreshPromise = null;
          }
        },
        
        refreshUnread: function () {
          var self = this;
          return this._initialize().then(function () {
            return self._fetchMembershipUnreads();
          });
        }
      });
      
      return {
        create: function (conn, membershipList) {
          return new MembershipListHandler(conn, membershipList);
        }
      };
    }
  ]);
