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
      };
      
      _.extend(HttpkomConnection.prototype, {
        _request: function(config) {
          config.headers = config.headers || {};
          if (this.httpkomId != null) {
            config.headers[httpkomConnectionHeader] = this.httpkomId;
          }
          return $http(config);
        },
        
        _createSessionAndRetry: function(originalRequest) {
          var deferred = $q.defer();
          var promise = deferred.promise;
          var self = this;
          sessionsService.createSession(this).then(
            function(response) {
              // if the create session succeeded, retry the first request.
              self._request(originalRequest).then(
                function(response) {
                  deferred.resolve(response);
                },
                function(response) {
                  deferred.reject(response);
                });
            },
            function(response) {
              deferred.reject(response);
            });
          
          return promise;
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
        
        http: function(config) {
          // Prefix url with the httpkom server and server id
          config.url = this._httpkomServer + '/' + this.serverId + config.url;
          
          var self = this;
          return this._request(config).then(
            function(response) {
              return response;
            },
            function(response) {
              if (response.status == 403) {
                $log.log("connectionFactory - http() - 403");
                // The httpkomId is invalid
                self.httpkomId = null;
                self.session = null;
                $rootScope.$broadcast('jskom:connection:changed', this);
                return self._createSessionAndRetry(response.config);
              } else if (response.status == 401) {
                $log.log("connectionFactory - http() - 401");
                // We are not logged in according to the server, so
                // reset the person object.
                self.session.person = null;
                $rootScope.$broadcast('jskom:connection:changed', this);
              }
              
              return $q.reject(response);
            });
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
