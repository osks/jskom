(function (jskom) {
  
  // We want to handle unread_texts and no_of_unread differently to be
  // able to only keep partial lists of unread texts in the future
  // (i.e unread_texts.length != no_of_unread).
  
  var Reader = function($q, textsService, conn) {
    this._$q = $q;
    this._textsService = textsService;
    this._conn = conn;
    this._membership = { unread_texts: [], no_of_unread: 0 }; // fake to avoid null
    this._pending = [];
    this._threadStack = [];
  };
  
  _.extend(Reader.prototype, {
    setMembership: function (membership) {
      // membership cannot be null
      this._membership = membership;
    },
    
    unshiftPending: function() {
      this._pending.unshift.apply(this._pending, arguments);
    },
    
    shiftPending: function () {
      return this._pending.shift();
    },
    
    pendingCount: function () {
      return this._pending.length;
    },
    
    hasPending: function () {
      return this._pending.length > 0;
    },
    
    shiftUnread: function () {
      return this._getNextUnreadText(this._membership.unread_texts, this._threadStack);
    },
    
    unreadCount: function () {
      return this._membership.no_of_unread;
    },
    
    hasUnread: function () {
      return this._membership.no_of_unread > 0;
    },
    
    isEmpty: function () {
      return !(this.hasPending() || this.hasUnread());
    },
    
    // The algorithm for finding the next unread text
    // ----------------------------------------------
    // 
    // Reads threads depth-first. The thread stack is used to remember
    // which other branches there were further up in the thread, so we know
    // where to continue when the current branch ends.
    // 
    // 1. Pick the unread text:
    //    
    //    If {threadStack} is empty: 
    //    
    //      If {unreadTexts} is empty: there is no unread text.
    //    
    //      If {unreadTexts} is not empty: Pick the text with the lowest
    //      text number as the unread text.
    //    
    //    If {threadStack} is not empty: pop a text and pick it as
    //    the unread text.
    // 
    // 2. Follow the thread
    //    
    //    To follow the thread correctly, we need to fetch the text we
    //    pick and push its unread comments onto the {threadStack}, in
    //    reverse order (so we pick the first comment first).
    // 
    // 
    // We return a promise for the unread text instead of the unread text,
    // because we must get the unread comments before the /next/ unread
    // text can be found. The typical usage is to read one text at a time,
    // so we assume that the callee will fetch the text. This means that
    // it is acceptable for us to not resolve the promise of the unread
    // text until we've actually fetched the text.
    // 
    // When we have fetched the unread text, we resolve the promise and
    // the callee can then fetch the text - which is now expected to be in
    // the cache - and will get the text immediately.
    // 
    _getFirstUnreadText: function (unreadTextNos, threadStack) {
      var unreadTextNo = null;
      if (threadStack.length > 0) {
        // continue in thread
        unreadTextNo = threadStack.pop();
      } else if (unreadTextNos.length > 0) {
        // pick a new thread start
        unreadTextNo = _.min(unreadTextNos);
      }
      return unreadTextNo;
    },

    _getUnreadComments: function (unreadTextNo, unreadTextNos) {
      return this._textsService.getText(this._conn, unreadTextNo).then(
        function(text) {
          var comments = _.map(text.comment_in_list, function(comment) {
            return comment.text_no;
          });
          
          if (comments != null && comments.length > 0) {
            // We filter instead of doing intersect because we need to
            // be sure that we preserve the order of the comments.
            var unreadComments = _.filter(comments, function(textNo) {
              return _.include(unreadTextNos, textNo)
            });
            return unreadComments;
          } else {
            return [];
          }
        });
    },
    
    _getNextUnreadText: function (unreadTextNos, threadStack) {
      var deferred = this._$q.defer();
      var unreadTextNo = this._getFirstUnreadText(unreadTextNos, threadStack);
      if (unreadTextNo != null) {
        this._getUnreadComments(unreadTextNo, unreadTextNos).then(
          function(unreadComments) {
            unreadComments.reverse();
            _.each(unreadComments, function(textNo) {
              threadStack.push(textNo);
            });
            deferred.resolve(unreadTextNo);
          },
          function(response) {
            deferred.reject(response);
          });
      } else {
        deferred.resolve(null);
      }
      return deferred.promise;
    }
  });

  jskom.Reader = Reader;

})(window.jskom);
