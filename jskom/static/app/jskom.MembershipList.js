// Copyright (C) 2012-2014 Oskar Skoog.

'use strict';

(function (jskom) {
  // The MembershipList stores the memberships. It provides
  // methods for accessing the full list of membership and the
  // list of unread memberships separately.
  
  function MembershipList() {
    this._membershipsMap = {};
    this._membershipUnreadsMap = null;
    this._unreadMemberships = null;
    this._readMemberships = null;
  };
  
  _.extend(MembershipList.prototype, {
    _patchMembership: function (membership) {
      var confNo = membership.conference.conf_no;
      if (_.has(this._membershipUnreadsMap, confNo)) {
        var mu = this._membershipUnreadsMap[confNo];
        membership.no_of_unread = mu.no_of_unread;
        membership.unread_texts = mu.unread_texts;
      } else {
        membership.no_of_unread = 0;
        membership.unread_texts = [];
      }
    },
    
    _rebuildMembershipLists: function () {
      if (this._membershipUnreadsMap !== null) {
        var self = this;
        _.each(this._membershipsMap, function (m) {
          self._patchMembership(m);
        });
        
        this._readMemberships = _.filter(this._membershipsMap, function (m) {
          return m.no_of_unread == 0;
        });
        
        this._unreadMemberships = _.filter(this._membershipsMap, function (m) {
          return m.no_of_unread > 0;
        });
      }
    },
    
    clear: function () {
      this._membershipsMap = {};
      this._membershipUnreadsMap = null;
      this._unreadMemberships = null;
      this._readMemberships = null;
    },
    
    
    // Must return the same object if nothing has changed.
    getReadMemberships: function () {
      return this._readMemberships;
    },
    
    // Must return the same object if nothing has changed.
    getUnreadMemberships: function () {
      return this._unreadMemberships;
    },
    
    // Must return the same object if nothing has changed.
    getMembership: function (confNo) {
      if (_.has(this._membershipsMap, confNo)) {
        return this._membershipsMap[confNo];
      } else {
        return null;
      }
    },
    
    
    addMembership: function (membership) {
      return this.addMemberships([ membership ]);
    },

    addMemberships: function (memberships) {
      var self = this;
      _.each(memberships, function (m) {
        self._membershipsMap[m.conference.conf_no] = m;
      });
      this._rebuildMembershipLists();
    },
    
    deleteMembership: function (confNo) {
      if (_.has(this._membershipsMap, confNo)) {
        delete this._membershipsMap[confNo];
        this._rebuildMembershipLists();
      }
    },
    
    updateMembership: function (membership) {
      // Update an existing membership object
      this._patchMembership(membership);
    },
    
    setMembershipUnreads: function (membershipUnreads) {
      this._membershipUnreadsMap = _.object(_.map(membershipUnreads, function (mu) {
        return [mu.conf_no, mu];
      }));
      this._rebuildMembershipLists();
    },
    
    setMembershipUnread: function (membershipUnread) {
      if (this._membershipUnreadsMap != null) {
        this._membershipUnreadsMap[membershipUnread.conf_no] = membershipUnread;
        this._rebuildMembershipLists();
      } else {
        // This should never happen
      }
    },
    
    markTextAsRead: function (textNo, recipientConfNos) {
      // Since memberships are update from membershipUnreads, we
      // only update membershipUnreads and then run
      // _update(). Possible not as fast, but much easier than
      // updating both memberships and membershipUnreads.
      var shouldUpdate = false;
      if (this._membershipUnreadsMap != null) {
        var self = this;
        _.each(recipientConfNos, function(confNo) {
          var mu = self._membershipUnreadsMap[confNo];
          if (mu != null) {
            var idx = mu.unread_texts.indexOf(textNo);
            if (idx !== -1) {
              mu.unread_texts.splice(idx, 1);
              mu.no_of_unread -= 1;
              shouldUpdate = true;
            }
          }
        });
      }
      
      if (shouldUpdate) {
        this._rebuildMembershipLists();
      }
    },
    
    markTextAsUnread: function (textNo, recipientConfNos) {
      // Since memberships are update from membershipUnreads, we
      // only update membershipUnreads and then run
      // _update(). Possible not as fast, but much easier than
      // updating both memberships and membershipUnreads.
      var shouldUpdate = false;
      if (this._membershipUnreadsMap != null) {
        var self = this;
        _.each(recipientConfNos, function(confNo) {
          var mu = self._membershipUnreadsMap[confNo];
          if (mu != null) {
            var idx = mu.unread_texts.indexOf(textNo);
            if (idx === -1) {
              mu.unread_texts.push(textNo);
              mu.no_of_unread += 1;
            shouldUpdate = true; // We change something, so we need to run update
            }
          }
        });
      }
      
      if (shouldUpdate) {
        this._rebuildMembershipLists();
      }
    }
  });

  jskom.MembershipList = MembershipList;

})(window.jskom);
