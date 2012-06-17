// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';

angular.module('jskom.services', []).
  factory('conferencesService', ['$http', function($http) {
    
    this.getUnreadConferences = function() {
      var config = { withCredentials: true };
      return $http.get('http://localhost:5001/conferences/unread/', config);
    };
    
    return this;
  }]).
  factory('textsService', ['$http', function($http) {
    
    this.getText = function(textNo) {
      var config = { withCredentials: true };
      return $http.get('http://localhost:5001/texts/' + textNo, config);
    };
    
    return this;
  }]);
