// Copyright (C) 2012-2014 Oskar Skoog.

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
    '$log', '$rootScope', '$q', '$http',
    'httpkom', 'sessionsService', 'jskomCacheFactory', 'httpkomConnectionHeader',
    'membershipListFactory', 'membershipListHandlerFactory',
    function($log, $rootScope, $q, $http,
             httpkom, sessionsService, jskomCacheFactory, httpkomConnectionHeader,
             membershipListFactory, membershipListHandlerFactory) {
      
      // TODO: is this unlikely enough to not get duplicates?
      var newId = function() {
        var min = 1;
        var max = 1000000000;
        // should be unique for each session within a specific browser
        // (i.e. localStorage instance).
        return "conn-" + (Math.floor(Math.random() * (max - min + 1)) + min);
      };
      
      return {
        createConnection: function(obj) {
          obj = obj || {};
          obj.id = obj.id || newId();
          obj.serverId = obj.serverId || null;
          obj.httpkomId = obj.httpkomId || null;
          obj.session = obj.session || null;
          return new jskom.HttpkomConnection(
            $log, $rootScope, $q, $http,
            sessionsService, jskomCacheFactory, httpkomConnectionHeader,
            membershipListFactory, membershipListHandlerFactory,
            httpkom.getHttpkomServer(), obj.id, obj.serverId, obj.httpkomId, obj.session,
            httpkom.getCacheVersion());
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
              // Initialize membershipListHandler
              connections[id].membershipListHandler.initialize();
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
            var sortedServerList = _.sortBy(_.values(servers),
                                            function (s) { return s.sort_order; });
            var firstServer = _.first(sortedServerList);
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
