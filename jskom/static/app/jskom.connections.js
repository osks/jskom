// Copyright (C) 2012 Oskar Skoog.

'use strict';

angular.module('jskom.connections', ['jskom.httpkom', 'jskom.services']).
  factory('jskomCacheFactory', [
    '$log', '$cacheFactory',
    function($log, $cacheFactory) {
      // Our $cacheFactory wrapper that allows you to remove keys that
      // doesn't exist.
      return function(cacheId, options) {
        var cache = $cacheFactory(cacheId, options);
        
        return {
          info: cache.info,
          put: cache.put,
          get: cache.get,
          remove: function(key) {
            if (!_.isUndefined(cache.get(key))) {
              cache.remove(key);
            }
          },
          removeAll: cache.removeAll,
          destroy: cache.destroy
        };
      };
    }
  ]).
  factory('connectionFactory', [
    '$rootScope', '$log', '$q', '$http',
    'httpkom', 'sessionsService', 'jskomCacheFactory', 'httpkomConnectionHeader',
    'membershipListFactory', 'membershipListHandlerFactory',
    function($rootScope, $log, $q, $http,
             httpkom, sessionsService, jskomCacheFactory, httpkomConnectionHeader,
             membershipListFactory, membershipListHandlerFactory) {
      var HttpkomConnection = function(httpkomServer, id, serverId, httpkomId, session) {
        this._httpkomServer = httpkomServer;
        this.id = id; // jskom internal id
        this.serverId = serverId;
        this.httpkomId = httpkomId;
        this.session = session;
        
        this.textsCache = jskomCacheFactory(this.id + '-texts', { capacity: 100 });
        this.marksCache = jskomCacheFactory(this.id + '-marks', { capacity: 100 });
        
        // TODO (refactoring idea): We send in this (as connection)
        // and this.memberships (as membershipList) separately to
        // MembershipListHandler because I think we want to refactor
        // HttpkomConnection to separate the connection/http handling
        // parts from the session/person/membership parts.
        // 
        // The services typically only use the this.http method,
        // this.getPersNo() and the caches. The exception is the
        // sessionsService, which also accesses this.httpkomId and
        // this.session in the connect/disconnect/login/logout
        // methods.
        // 
        // There is a need for a unified object that ties everything
        // together, like what HttpkomConnnection does, since the
        // connection (httpkomId, outstanding requests and perhaps
        // also the lyskom session_no) and session (person, caches,
        // membership - the logged in parts) are tightly coupled - the
        // session belongs to the connection. But I think we could
        // separate them more.
        // 
        // Perhaps we could make a httpkomConnectionService or
        // something like that, which operates on an object
        // ("interface"), like how sessionsService works now (it
        // updates this.httpkomId, this.session and so on).
        
        this._createSessionPromise = null;
        this._pendingRequests = [];
        
        // TODO (refactoring idea): Create a separate class for
        // handling user-active.
        this._userActiveIntervalMs = 40*1000; // milliseconds
        this._userActiveLastSent = null;
        this._userActivePromise = null;
        
        this.membershipListHandler = membershipListHandlerFactory.create(
          this, membershipListFactory.create());
        
        // The conference number for the current working conference
        // (change-conference). When changing conference, the lyskom
        // server will update last-time-read for the membership for
        // the conference you were in previously in. We use this
        // number to be able to invalidate cached memberships
        // correctly.
        this.currentConferenceNo = 0;
      };
      
      _.extend(HttpkomConnection.prototype, {
        _getBroadcastName: function (eventName) {
          return eventName + ":" + this.id.toString();
        },
        
        broadcast: function (eventName, args) {
          // The args paramter symbolizes arg1, arg2, ..., argN
          
          // Wrap the arguments for our own filtering
          var broadcastArgs = { connection: this, args: _.toArray(arguments).slice(1) };
          return $rootScope.$broadcast(this._getBroadcastName(eventName), broadcastArgs);
        },
        
        on: function (name, listenerFn) {
          var self = this;
          return $rootScope.$on(this._getBroadcastName(name), function ($event, broadcastArgs) {
            // Only call args to our connection. Since we use our ID
            // in the broadcast name, we should only get events for
            // our own connection, but we check anyway.
            if (self === broadcastArgs.connection) {
              $log.log("HttpkomConnection - on(" + $event.name + ")");
              // overwrite the name in the event to hide our internal
              // broadcast name
              $event.name = name;
              var listenerArgs = [ $event ].concat(broadcastArgs.args);
              listenerFn.apply(self, listenerArgs);
            }
          });
        },
        
        userIsActive: function() {
          var self = this;
          if (this._userActiveLastSent == null
              || Date.now() - this._userActiveIntervalMs >= this._userActiveLastSent) {
            if (this._userActivePromise == null) {
              $log.log("HttpkomConnection - userIsActive(" + this.getPersNo() +
                       ") - sending new user-active");
              this._userActivePromise = sessionsService.userIsActive(this).then(
                function() {
                  self._userActivePromise = null;
                  // Don't update last sent until we get a successful response
                  self._userActiveLastSent = Date.now();
                },
                function() {
                  self._userActivePromise = null;
                });
            } else {
              //$log.log("HttpkomConnection - userIsActive(" + this.getPersNo() +
              //         ") - there is an active request");
            }
          } else {
            //$log.log("HttpkomConnection - userIsActive(" + this.getPersNo() +
            //           ") - user-active was sent recently");
          }
        },
        
        _addPendingRequest: function(deferred, requireSession, requireLogin) {
          this._pendingRequests.push({
            deferred: deferred,
            requireLogin: requireLogin,
            requireSession: requireSession
          });
        },
        
        _removePendingRequest: function(deferred) {
          this._pendingRequests = _.filter(this._pendingRequests, function(req) {
            return req.deferred !== deferred
          });
        },
        
        _findPendingRequest: function(deferred) {
          return _.find(this._pendingRequests, function(req) {
            return req.deferred === deferred
          });
        },
        
        _hasPendingRequest: function(deferred) {
          return this._findPendingRequest(deferred) ? true : false;
        },
        
        _cancelAllPendingRequestsRequiringLogin: function() {
          $log.log("HttpkomConnection - http() - canceling all requests requiring login");
          this._pendingRequests = _.filter(this._pendingRequests, function(req) {
            return !req.requireLogin;
          });
        },
        
        _cancelAllPendingRequestsRequiringSession: function() {
          this._cancelAllPendingRequestsRequiringLogin();
          $log.log("HttpkomConnection - http() - canceling all requests requiring session");
          this._pendingRequests = _.filter(this._pendingRequests, function(req) {
            return !req.requireSession;
          });
        },
        
        _request: function(config, requireSession, requireLogin) {
          // This method issues the $http requests after we have added
          // httpkom headers. It also checks for 401 and 403 responses
          // and resets the connection variables.  We wrap the $http
          // request in our own deferred so we can decide if and when
          // we should resolve/reject it.
          
          var deferred = $q.defer();
          var promise = deferred.promise;
          var self = this;
          
          config.headers = config.headers || {};
          if (requireSession) {
            config.headers[httpkomConnectionHeader] = this.httpkomId;
          }
          
          // Safari in iOS 6 has excessive caching, so this is to make
          // sure it doesn't cache our POST requests.
          if (config.method != null && config.method.toLowerCase() == 'post') {
            config.headers['Cache-Control'] = 'no-cache';
          }
          
          var request = $http(config);
          this._addPendingRequest(deferred, requireSession, requireLogin);
          request.then(
            function(response) {
              if (self._hasPendingRequest(deferred)) {
                deferred.resolve(response);
                self._removePendingRequest(deferred);
              }
            },
            function(response) {
              if (self._hasPendingRequest(deferred)) {
                deferred.reject(response);
                self._removePendingRequest(deferred);
                
                if (response.status === 401) {
                  $log.log("HttpkomConnection - _request() - 401: ") + config.url;
                  self._cancelAllPendingRequestsRequiringLogin();
                  // We are not logged in according to the server, so
                  // reset the person object.
                  self._resetPerson();
                } else if (response.status === 403) {
                  $log.log("HttpkomConnection - _request() - 403: " + config.url);
                  // Both the httpkomId and session are invalid.
                  self._cancelAllPendingRequestsRequiringSession();
                  self._resetSession();
                } else if (response.status === 500) {
                  $log.log("HttpkomConnection - _request() - 500: " + config.url);
                  var error = response.data;
                  if (_.isObject(error)
                      && error.error_type === 'httpkom' && error.error_msg === '') {
                    // Note: This is a work-around to make it easier
                    // to handle httpkom sessions that dies
                    // unexpectedly. We don't know why it happens and
                    // it's hard to logout when it happens. This is
                    // the only known case where we get this kind of
                    // error, so this is an experiment to see if this
                    // is improves the experience until we can solve
                    // the real problem.
                    
                    self._cancelAllPendingRequestsRequiringSession();
                    self._resetSession();
                  }
                }
              }
            });
          
          return promise;
        },
        
        _resetSession: function() {
          if (this.httpkomId || this.session) {
            this.httpkomId = null;
            this.session = null;
            this.membershipListHandler.reset();
            $rootScope.$broadcast('jskom:connection:changed', this);
          }
        },
        
        _resetPerson: function() {
          if (this.isLoggedIn()) {
            this.session.person = null;
            this.membershipListHandler.reset();
            $rootScope.$broadcast('jskom:connection:changed', this);
          }
        },
        
        _createSessionAndRetry: function(originalRequest, requireSession, requireLogin) {
          $log.log("HttpkomConnection - createSessionAndRetry(): " + originalRequest.url);
          var deferred = $q.defer();
          var promise = deferred.promise;
          var self = this;
          
          if (this._createSessionPromise == null) {
            this._createSessionPromise = sessionsService.createSession(this).then(
              function(session) {
                $log.log("HttpkomConnection - createSession - success");
                self._createSessionPromise = null;
                return session;
              },
              function(response) {
                $log.log("HttpkomConnection - createSession - failure");
                self._createSessionPromise = null;
                return $q.reject(response);
              });
          }
          
          this._createSessionPromise.then(
            function() {
              $log.log("HttpkomConnection - createSessionPromise - success");
              // createSession succeeded, issue the original request.
              self._request(originalRequest, requireSession, requireLogin).then(
                function(orgResponse) {
                  deferred.resolve(orgResponse);
                },
                function(orgResponse) {
                  deferred.reject(orgResponse);
                });
            },
            function() {
              $log.log("HttpkomConnection - createSessionPromise - failure");
              // createSession failed
              // todo: what should we really do here?
              deferred.reject({
                data: null,
                status: 403,
                headers: null,
                config: originalRequest
              });
            });
          
          return promise;
        },
        
        http: function(config, requireSession, requireLogin) {
          requireSession = requireSession || false;
          requireLogin = requireLogin || false;
          
          // Prefix url with the httpkom server and server id
          config.url = this.urlFor(config.url, false);
          
          // Our $http wrapper.
          //
          // 1. Check if there is an outstanding createSession request.
          // 
          //   a. There is: Append the request to the createSession
          //      request, so it is issued when the createSession
          //      request succeeds.
          //
          //   b. There is not: Issue the request with a check for
          //      failure status 403. If the requests fails with
          //      status 403, issue a createSession request and append
          //      the original request as a re-try.
          // 
          // If a createSession request fails, all appended requests
          // should be rejected with this made up response:
          // 
          //   {
          //     data: null,
          //     status: 403,
          //     headers: null,
          //     config: request.config
          //   }
          

          var self = this;
          if (requireLogin && !this.isLoggedIn()) {
            // Requests that require login will not succeed after
            // createSession either, because the user has to
            // login. Fail them immediately.
            $log.log("HttpkomConnection - http() - failing request that requires login");
            return $q.reject({
              data: null,
              status: 401,
              headers: null,
              config: config
            });
          } else if (requireSession && !this.isConnected()) {
            $log.log("HttpkomConnection - http() - retrying request after create session");
            return this._createSessionAndRetry(config, requireSession, requireLogin);
          } else {
            //$log.log("HttpkomConnection - http() - issuing request");
            return this._request(config, requireSession, requireLogin).then(
              null,
              function(response) {
                if (response.status == 403 && !requireLogin) {
                  return self._createSessionAndRetry(config, requireSession, requireLogin);
                } else {
                  return $q.reject(response);
                }
              });
          }
        },
        
        clearAllCaches: function() {
          $log.log("connection(id: " + this.id + ") - clearing all caches");
          this.textsCache.removeAll();
          this.marksCache.removeAll();
        },
        
        destroyAllCaches: function() {
          this.textsCache.destroy();
          this.marksCache.destroy();
        },
        
        urlFor: function(path, addHttpkomIdQueryParameter) {
          var url = this._httpkomServer + '/' + this.serverId + path;
          if (addHttpkomIdQueryParameter) {
            var kv = encodeURIComponent(httpkomConnectionHeader) + '=' +
              encodeURIComponent(this.httpkomId);
            if (url.indexOf('?') == -1) {
              url += '?' + kv;
            } else {
              url += '&' + kv;
            }
          }
          return url;
        },
        
        isConnected: function() {
          return (this.httpkomId && this.session) ? true : false;
        },
        
        isLoggedIn: function() {
          // We want to explicitly return true or false, because
          // "(this.session && this.session.person)" doesn't return a
          // boolean, but rather null, undefined or true depending on
          // the values. This causes angular to change state in an
          // ng-switch, and re-draw the DOM (which resets the scope).
          return (this.session && this.session.person) ? true : false;
        },
        
        getPersNo: function() {
          if (this.isLoggedIn()) {
            return this.session.person.pers_no;
          } else {
            return null;
          }
        },
        
        toObject: function() {
          return {
            id: this.id,
            httpkomId: this.httpkomId,
            serverId: this.serverId,
            session: this.session
          };
        }
      });
      
      // TODO: is this unlikely enough to not get duplicates?
      var newId = function() {
        var min = 1;
        var max = 1000000000;
        return "conn-" + (Math.floor(Math.random() * (max - min + 1)) + min);
      };
      
      return {
        createConnection: function(obj) {
          obj = obj || {};
          obj.id = obj.id || newId();
          obj.serverId = obj.serverId || null;
          obj.httpkomId = obj.httpkomId || null;
          obj.session = obj.session || null;
          return new HttpkomConnection(httpkom.getHttpkomServer(),
                                       obj.id, obj.serverId, obj.httpkomId, obj.session);
        }
      };
    }
  ]).
  factory('connectionsStorage', [
    '$log', 'connectionFactory', 'messagesService',
    function($log, connectionFactory, messagesService) {
      var hasStorage = false;
      var storage;

      function initialize() {
        try {
          if (!!window.localStorage) {
            storage = window.localStorage;
            storage.setItem("initializationTest", "123");
            if (storage.getItem("initializationTest") == "123") {
              hasStorage = true;
            }
          } else {
            hasStorage = false;
            messagesService.showMessage('warning', 'Failed to initialize local storage.');
          }
        } catch (e) {
          hasStorage = false;
          if (e instanceof QuotaExceededError) {
            localStorage.clear();
            messagesService.showMessage(
              'warning', e.name + ': Failed to initialize local storage.',
              e.message + " Try reloading the page.");
          } else if (e instanceof SecurityError) {
            messagesService.showMessage(
              'error', e.name + ': Failed to initialize local storage.', e.message);
          } else {
            messagesService.showMessage(
              'error', e.name + ': Failed to initialize local storage.', e.message);
          }
        }
      }
      
      initialize();
      
      return {
        saveCurrentConnectionId: function(id) {
          if (!hasStorage) return;
          
          try {
            storage.removeItem("currentConnectionId"); // temp hack
            storage.setItem("currentConnectionId", id);
          } catch (e) {
            messagesService.showMessage(
              'error', e.name + ': Failed to access local storage.', e.message);
          }
        },
        
        loadCurrentConnectionId: function() {
          if (!hasStorage) return null;
          
          try {
            return storage.getItem("currentConnectionId");
          } catch (e) {
            messagesService.showMessage(
              'error', e.name + ': Failed to access local storage.', e.message);
          }
        },
        
        loadConnections: function() {
          if (!hasStorage) return {};
          
          // If there is list of connections in storage, create one.
          try {
            var connections = angular.fromJson(storage.getItem("connections"));
            connections = connections || {};
            _.each(connections, function(connObj, id) {
              connections[id] = connectionFactory.createConnection(connObj);
            });
            return connections;
          } catch (e) {
            $log.log("Failed to load connections: " + e)
            messagesService.showMessage(
              'error', e.name + ': Failed to access local storage.', e.message);
            throw e;
          }
        },
        
        saveConnections: function(connections) {
          if (!hasStorage) return;
          
          try {
            var objs = {};
            _.each(connections, function(conn, id) {
              objs[id] = conn.toObject();
            });
            storage.removeItem("connections"); // temp hack
            storage.setItem("connections", angular.toJson(objs));
          } catch (e) {
            $log.log("Failed to load connections: " + e)
            messagesService.showMessage(
              'error', e.name + ': Failed to access local storage.', e.message);
          }
        },
      };
    }
  ]).
  factory('connectionsService', [
    '$rootScope', '$log', '$q',
    'httpkom', 'connectionsStorage', 'connectionFactory', 'sessionsService',
    function($rootScope, $log, $q,
             httpkom, connectionsStorage, connectionFactory, sessionsService) {
      var connections = connectionsStorage.loadConnections();
      var currentConnectionId = connectionsStorage.loadCurrentConnectionId();
      
      var saveCurrentId = function() {
        connectionsStorage.saveCurrentConnectionId(currentConnectionId);
      };
      
      var saveConnections = function() {
        connectionsStorage.saveConnections(connections);
      };

      var addConnection = function(connection) {
        connections[connection.id] = connection;
        saveConnections();
      };
      
      var setCurrentConnection = function(connection) {
        if (connection) {
          if (!connection[connection.id]) {
            addConnection(connection);
          }
          currentConnectionId = connection.id;
        } else {
          currentConnectionId = null;
        }
        saveCurrentId();
        pruneInactiveConnections();
      };
      
      var removeConnection = function(connection) {
        if (currentConnectionId == connection.id) {
          currentConnectionId = null;
          saveCurrentId();
        }
        if (connections[connection.id]) {
          connections[connection.id].destroyAllCaches();
          delete connections[connection.id];
        }
        saveConnections();
        if (currentConnectionId == null) {
          var firstConn = _.first(_.values(connections));
          if (firstConn) {
            setCurrentConnection(firstConn);
          } else {
            createNewConnectionPromise().then(
              function(newConn) {
                setCurrentConnection(newConn);
              });
          }
        }
      };
      
      var pruneInvalidConnections = function(servers) {
        // Remove connections to lyskom servers that no longer exist
        // on httpkom.
        _.each(connections, function(conn) {
          // Remove connections to servers that don't exist, because
          // we can't do anything with them.
          if (!_.has(servers, conn.serverId)) {
            $log.log("connectionsService - removing invalid connection (unknown serverId: " +
                     conn.serverId + "): " + conn.id);
            removeConnection(conn);
          }
        });
      };
      
      var serversPromise = httpkom.getLyskomServers().then(
        function(response) {
          $log.log("connectionsService - getServers() - success");
          pruneInvalidConnections(response.data);
          pruneInactiveConnections();
          return response.data;
        },
        function(response) {
          $log.log("connectionsService - getServers() - error");
            return $q.reject(response);            
        });
      
      var createNewConnectionPromise = function() {
        var deferred = $q.defer();
        var promise = deferred.promise;
        serversPromise.then(
          function(servers) {
            var firstServer = _.first(_.values(servers));
            var serverId = null;
            if (firstServer) {
              serverId = firstServer.id;
            }
            var conn = connectionFactory.createConnection({ serverId: serverId });
            deferred.resolve(conn);
          },
          function(response) {
            deferred.reject(response);
          });
        return promise;
      };
      
      var pruneInactiveConnections = function() {
        _.each(connections, function(conn) {
          // Only check connections that are not the current one
          if (conn.id != currentConnectionId && !conn.isLoggedIn()) {
            $log.log("connectionsService - removing inactive connection: " + conn.id);
            if (conn.isConnected()) {
              sessionsService.deleteSession(conn, 0).then(
                function() {
                    removeConnection(conn);
                });
            } else {
              removeConnection(conn);
            }
          }
        });
      };
      
      $rootScope.$on('jskom:connection:changed', function($event, connection) {
        $log.log('connectionsService - on(jskom:connection:changed)');
        saveConnections();
      });

      return {
        getServers: function() {
          return serversPromise;
        },
        
        newConnectionPromise: function() {
          return createNewConnectionPromise();
        },
        
        getCurrentConnection: function() {
          return connections[currentConnectionId];
        },
        
        setCurrentConnection: function(connection) {
          setCurrentConnection(connection);
        },
        
        addConnection: function(connection) {
          addConnection(connection);
        },
        
        removeConnection: function(connection) {
          removeConnection(connection);
        },
        
        getConnections: function() {
          return connections;
        },
      };
    }
  ]);
