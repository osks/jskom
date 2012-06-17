// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.controllers', ['jskom.auth']).
  controller('SessionCtrl', [
    '$rootScope', '$scope', 'authService',
    function($rootScope, $scope, authService) {
      $scope.state = 'loading';
      $scope.session = { client: { name: 'jskom', version: '0.2' } };
      
      
      $rootScope.$on('event:loginRequired', function() {
        jskom.Log.debug("SessionCtrl - event:loginRequired");
        $scope.state = 'notLoggedIn';
      });
      
      authService.getCurrentSession().
        success(function(data) {
          jskom.Log.debug("SessionCtrl - getCurrentSession() - success");
          $scope.state = 'loggedIn';
          $scope.session = data;
        }).
        error(function() {
          jskom.Log.debug("SessionCtrl - getCurrentSession() - error");
          $scope.state = 'notLoggedIn';
        });
      
      
      $scope.login = function() {
        jskom.Log.debug("SessionCtrl - login()");
        
        authService.createSession($scope.session).
          success(function(data) {
            jskom.Log.debug("SessionCtrl - login() - success");
            $scope.state = 'loggedIn';
            $scope.session = data;
          }).
          error(function() {
            jskom.Log.debug("SessionCtrl - login() - error");
            $scope.state = 'notLoggedIn';
          });
      };
      
      
      $scope.logout = function() {
        jskom.Log.debug("SessionCtrl - logout()");
        
        authService.destroySession(authService.getCurrentSessionId());
        // set logged out regardless of how it went.
        $scope.state = 'notLoggedIn';
      };
    }
  ]).
  controller('UnreadConfsCtrl', [
    '$scope', '$http', 'conferencesService',
    function($scope, $http, conferencesService) {
      $scope.unreadConfs = [];
      
      conferencesService.getUnreadConferences().
        success(function(data) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - success");
          $scope.unreadConfs = data.confs;
        }).
        error(function(data) {
          jskom.Log.debug("UnreadConfsCtrl - getUnreadConferences() - error");
          // todo: error handling
          jskom.Log.debug(data);
        });
    }
  ]).
  controller('ShowTextCtrl', [
    '$scope', '$routeParams', 'textsService',
    function($scope, $routeParams, textsService) {
      textsService.getText($routeParams.textNo).
        success(function(data) {
          jskom.Log.debug("ShowTextCtrl - getText() - success");
          $scope.text = data;
        }).error(function(data, status) {
          jskom.Log.debug("ShowTextCtrl - getText() - error");
          // todo: error handling.
          jskom.Log.debug(data);
        });
    }
  ]).
  controller('ReaderCtrl', [
    '$scope',
    function($scope) {
    }
  ]);
