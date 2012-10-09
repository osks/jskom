// Copyright (C) 2012 Oskar Skoog. Released under GPL.

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
    function($rootScope, $log, $q, $http,
             httpkom, sessionsService, jskomCacheFactory, httpkomConnectionHeader) {
      var HttpkomConnection = function(httpkomServer, id, serverId, httpkomId, session) {
        this._httpkomServer = httpkomServer;
        this.id = id; // our internal id
        this.serverId = serverId;
        this.httpkomId = httpkomId;
        this.session = session;
        
        this.textsCache = jskomCacheFactory(this.id + '-texts', { capacity: 100 });
        this.membershipsCache = jskomCacheFactory(this.id + '-memberships', { capacity: 100 });
        
        this._createSessionPromise = null;
        this._pendingRequests = [];
      };
      
      _.extend(HttpkomConnection.prototype, {
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
          $log.log("connectionFactory - http() - canceling all requests requiring login");
          this._pendingRequests = _.filter(this._pendingRequests, function(req) {
            return !req.requireLogin;
          });
        },
        
        _cancelAllPendingRequestsRequiringSession: function() {
          this._cancelAllPendingRequestsRequiringLogin();
          $log.log("connectionFactory - http() - canceling all requests requiring session");
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
                
                if (response.status == 401) {
                  $log.log("connectionFactory - _request() - 401: ") + config.url;
                  self._cancelAllPendingRequestsRequiringLogin();
                  
                  // We are not logged in according to the server, so
                  // reset the person object.
                  if (self.isLoggedIn()) {
                    self.session.person = null;
                    $rootScope.$broadcast('jskom:connection:changed', self);
                  }
                } else if (response.status == 403) {
                  $log.log("connectionFactory - _request() - 403: " + config.url);
                  // Both the httpkomId and session are invalid.
                  self._cancelAllPendingRequestsRequiringSession();
                  
                  if (self.httpkomId || self.session) {
                    self.httpkomId = null;
                    self.session = null;
                    $rootScope.$broadcast('jskom:connection:changed', self);
                  }
                }
              }
            });
          
          return promise;
        },
        
        _createSessionAndRetry: function(originalRequest, requireSession, requireLogin) {
          $log.log("connectionFactory - createSessionAndRetry(): " + originalRequest.url);
          var deferred = $q.defer();
          var promise = deferred.promise;
          var self = this;
          
          if (this._createSessionPromise == null) {
            this._createSessionPromise = sessionsService.createSession(this).then(
              function(response) {
                $log.log("connectionFactory - createSession - success");
                self._createSessionPromise = null;
                return response;
              },
              function(response) {
                $log.log("connectionFactory - createSession - failure");
              self._createSessionPromise = null;
                return $q.reject(response);
              });
          }
          
          this._createSessionPromise.then(
            function() {
              $log.log("connectionFactory - createSessionPromise - success");
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
              $log.log("connectionFactory - createSessionPromise - failure");
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
            $log.log("connectionFactory - http() - failing request that requires login");
            return $q.reject({
              data: null,
              status: 401,
              headers: null,
              config: config
            });
          } else if (requireSession && !this.isConnected()) {
            $log.log("connectionFactory - http() - retrying request after create session");
            return this._createSessionAndRetry(config, requireSession, requireLogin);
          } else {
            //$log.log("connectionFactory - http() - issuing request");
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
          this.membershipsCache.removeAll();
        },
        
        destroyAllCaches: function() {
          this.textsCache.destroy();
          this.membershipsCache.destroy();
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
          return this.session.person.pers_no;
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
    '$log', 'connectionFactory',
    function($log, connectionFactory) {
      return {
        saveCurrentConnectionId: function(id) {
          localStorage.setItem("currentConnectionId", id);
        },
        
        loadCurrentConnectionId: function() {
          return localStorage.getItem("currentConnectionId");
        },
        
        loadConnections: function() {
          // If there is list of connections in localStorage, create one.
          var connections = angular.fromJson(localStorage.getItem("connections"));
          connections = connections || {};
          _.each(connections, function(connObj, id) {
            connections[id] = connectionFactory.createConnection(connObj);
          });
          return connections;
        },
        
        saveConnections: function(connections) {
          var objs = {};
          _.each(connections, function(conn, id) {
            objs[id] = conn.toObject();
          });
          localStorage.setItem("connections", angular.toJson(objs));
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
      
      var serversPromise = httpkom.getLyskomServers().then(
        function(response) {
          $log.log("connectionsService - getServers() - success");
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
