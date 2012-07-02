// Copyright (C) 2012 Oskar Skoog. Released under GPL.

'use strict';


(function($) {

  var ojskom;    
  ojskom = window.ojskom = {
    version: "0.1",
    
    Routers: {},
    Models: {},
    Collections: {},
    Views: {},
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
      HttpkomServer: "",
      PrefetchCount: 2
    },
    
    Log: {
      debug: function() {
        if (window.console && console.log) {
          console.log.apply(console, arguments);
        }
      }
    },
    
  };
})(jQuery);



(function($) {

  var jskom;    
  jskom = window.jskom = {
    version: "0.1",
    
    Routers: {},
    Models: {},
    Collections: {},
    Views: {},
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
      HttpkomServer: "",
      PrefetchCount: 2
    },
    
    Log: {
      debug: function() {
        if (window.console && console.log) {
          console.log.apply(console, arguments);
        }
      }
    },
    
  };
  
  var checkBrowser = function() {
    var supported = true;
    var ul = $("<ul></ul>");
    if (!$.support.ajax) {
      supported = false;
      $(ul).append("<li>Ajax</li>");
    }
    if (!$.support.cors) {
      supported = false;
      $(ul).append("<li>CORS</li>");
    }
    
    if (!supported) {
      $('body').empty().append("<div></div>");
      $('body div')
        .append('<h3>Your browser is too old for jskom</h3>')
        .append('Missing support for:')
        .append(ul);
      return false;
    } else {
      return true;
    }
  };

  $(function() {
    checkBrowser();
  });
})(jQuery);



angular.module('jskom', ['jskom.auth', 'jskom.services', 'jskom.controllers',
                         'jskom.filters', 'jskom.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/static/partials/unreadconfs.html', controller: 'UnreadConfsCtrl'
      }).
      when('/conferences/:confNo/unread/', {
        templateUrl: '/static/partials/reader.html', controller: 'ReaderCtrl'
      }).
      when('/texts/new', {
        templateUrl: '/static/partials/new_text.html', controller: 'NewTextCtrl'
      }).
      when('/texts/:textNo', {
        templateUrl: '/static/partials/text.html', controller: 'ShowTextCtrl'
      }).
      otherwise({ redirectTo: '/' });
  }]).
  config(['$locationProvider', function($locationProvider) {  
    $locationProvider.hashPrefix('');
    $locationProvider.html5Mode(true);
  }]);



var ReadQueue = function() {
  this._prefetchCount = jskom.Settings.PrefetchCount;
  this._currentText = null;
  this._currentThreadStack = [];
  this._unreadTexts = [];
}

_.extend(ReadQueue.prototype, {
  add: function(unreadTexts) {
    this._unreadTexts = _.union(this._unreadTexts, unreadTexts);
    this._unreadTexts.sort();
    
    if (this._currentText == null && this._unreadTexts.length > 0) {
      this.moveNext();
    }
  },
  
  current: function() {
    return this._currentText;
  },
  
  isEmpty: function() {
    return !(this.size() > 0);
  },
  
  size: function() {
    // should we include currentText or not? currently we don't,
    // because it is assumed to be read.
    return this._unreadTexts.length;
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
    // If there are texts on the stack: pop to get the new text.
    // 
    // Else: find new thread start by selecting the unread text
    // with lowest text number.
    // 
    // For the new text, push all unread comments onto the stack, in
    // reverse order.
    
    var nextText = null;
    if (this._currentThreadStack.length > 0) {
      // We still have texts to read in this thread
      nextText = this._currentThreadStack.pop();
      this._unreadTexts = _.without(this._unreadTexts, nextText);
      this._unreadTexts.sort(); // todo: do we need to sort it here?
      jskom.Log.debug("readQueue:moveNext() - pop:ed " + nextText + " from stack.")
    } else {
      // No more texts in this thread, find new thread
      
      if (this._unreadTexts.length > 0) {
        // We have unread texts, find new thread start by taking the
        // lowest text number.
        // Since this._unreadTexts is sorted, we just shift.
        nextText = this._unreadTexts.shift();
        jskom.Log.debug("readQueue:moveNext() - found new thread in " + nextText);
      } else {
        // No unread texts
        nextText = null;
        jskom.Log.debug("readQueue:moveNext() - no unread texts.")
      }
    }
    
    if (nextText == null) {
      // Nothing to read, set currentText to null
      this._currentText = null;
    } else {
      this._currentText = nextText;
      
      /*
      // Start fetching the new current text, and when we have
      // fetched the text: Push all comments onto the stack, in
      // reverse order
      
      var self = this;
      nextText.deferredFetch().done(function() {
        // Don't trigger the change event until we've fetched the text
        // That way we know that we won't call moveNext() again until
        // the new text has been fetched.
        self._currentText = nextText;
        
        var comments = _.clone(nextText.get('comment_in_list'));
        if (comments) {
          var commentTextNos = _.pluck(comments, 'text_no');
          commentTextNos.reverse();
          _.each(commentTextNos, function(commentTextNo) {
            self._currentThreadStack.push(new Models.Text({
              text_no: commentTextNo
            }));
          });
        }
        
        // Simple prefetch of texts on the thread stack, we
        // wait for the fetch so we can consider the new
        // text's comments. ("last" because we pop from the end of the array)
        _.each(_.last(self._currentThreadStack, self._prefetchCount), function(text) {
          jskom.Log.debug("readQueue:moveNext() - prefetching comment "
                    + text.get('text_no'));
          text.deferredFetch();
        });
      });
      
      // Simple prefetch of the texts with low text numbers
      // ("thread starts"), no need to wait for fetching of the
      // new text.
      _.each(this._unreadTexts.first(this._prefetchCount), function(text) {
        jskom.Log.debug("readQueue:moveNext() - prefetching " + text.get('text_no'));
        text.deferredFetch();
      });
      */
    }
  }
});
