// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', []).
  factory('conferencesService', ['$http', function($http) {
    
    this.getUnreadConferences = function() {
      var config = { withCredentials: true };
      return $http.get(jskom.Settings.HttpkomServer + '/conferences/unread/', config);
    };
    
    return this;
  }]).
  factory('textsService', ['$http', function($http) {
    
    this.getText = function(textNo) {
      var config = { withCredentials: true };
      return $http.get(jskom.Settings.HttpkomServer + '/texts/' + textNo, config);
    };
    
    this.createText = function(text) {
      var config = { withCredentials: true };
      return $http.post(jskom.Settings.HttpkomServer + '/texts/', text, config);
    };
    
    return this;
  }]);
