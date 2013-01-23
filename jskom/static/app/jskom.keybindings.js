// Copyright (C) 2012, 2013 Oskar Skoog.

'use strict';

angular.module('jskom.keybindings', []).
  factory('keybindingService', [
    '$log', '$rootScope',
    function($log, $rootScope) {
      Mousetrap.reset();
      var generalKeyBindings = [];
      var pageSpecificKeyBindings = [];
      
      var resetBindings = function() {
        // Only unbind page specific key bindings on reset.
        _.each(pageSpecificKeyBindings, function(kb) {
          _.each(kb.keys, function(key) {
            unbindKey(key);
          });  
        });
        
        pageSpecificKeyBindings = [];
      };
      
      var removeBindingsForKey = function(key) {
        var removeKeyFromKeyBindings = function(keyBindings) {
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
          return keep;
        }
        
        generalKeyBindings = removeKeyFromKeyBindings(generalKeyBindings);
        pageSpecificKeyBindings = removeKeyFromKeyBindings(pageSpecificKeyBindings);
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
        
        if (keyBinding.isPageSpecific) {
          pageSpecificKeyBindings.push(keyBinding);
        } else {
          generalKeyBindings.push(keyBinding);
        }
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
        bindGeneral: function(keys, description, callbackFn) {
          addBinding({
            keys: keys,
            isPageSpecific: false,
            description: description,
            callback: callbackFn
          });
        },
        
        bindPageSpecific: function(keys, description, callbackFn) {
          addBinding({
            keys: keys,
            isPageSpecific: true,
            description: description,
            callback: callbackFn
          });
        },
        
        reset: function() {
          resetBindings();
        },
        
        getGeneralBindings: function() {
          return generalKeyBindings;
        },
        
        getPageSpecificBindings: function() {
          return pageSpecificKeyBindings;
        },
      };
    }
  ]).
  run([
    '$log', '$location', '$rootScope', '$routeParams', '$window', 'keybindingService',
    function($log, $location, $rootScope, $routeParams, $window, keybindingService) {
      keybindingService.bindGeneral('g', 'Go to conference...', function(e) {
        $rootScope.$apply(function() {
          $location.url('/conferences/go-to');
        });
        return false;
      });
      
      keybindingService.bindGeneral('p', 'Browser history back', function(e) {
        $rootScope.$apply(function() {
          $window.history.back();
        });
        return false;
      });
      
      keybindingService.bindGeneral('n', 'Browser history forward', function(e) {
        $rootScope.$apply(function() {
          $window.history.forward();
        });
        return false;
      });
      
      keybindingService.bindGeneral('i', 'New text...', function(e) {
        $rootScope.$apply(function() {
          if (!_.isUndefined($routeParams.confNo)) {
            $location.url('/conferences/' + $routeParams.confNo + '/texts/new');
          } else {
            $location.url('/texts/new');
          }
        });
        return false;
      });
      
      keybindingService.bindGeneral('e', 'Set unread...', function(e) {
        $rootScope.$apply(function() {
          if (!_.isUndefined($routeParams.confNo)) {
            $location.url("/conferences/" + $routeParams.confNo + "/set-unread");
          } else {
            $location.url("/conferences/set-unread");
          }
        });
        return false;
      });
    }
  ]);
