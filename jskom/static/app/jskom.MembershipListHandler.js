// Copyright (C) 2012-2014 Oskar Skoog.

'use strict';

(function (jskom) {
  // The MembershipListHandler regularly polls the server for any
  // new unread texts/memberships and upates the membership
  // list. The handling parts include updating the list of
  // memberships with what texts are unread and how many unread
  // there are.
  function MembershipListHandler($log, $q, $timeout, membershipsService, conn, membershipList) {
    this._$log = $log;
    this._$q = $q;
    this._$timeout = $timeout;
    this._membershipsService = membershipsService;
    
    this._conn = conn;
    this._membershipList = membershipList;
    this._logPrefix = "MembershipListHandler - ";
    
    this._initializePromise = null;
    
    this._refreshIntervalSeconds = 2*60;
    this._autoRefreshPromise = null;
  };
  
  _.extend(MembershipListHandler.prototype, {
    initialize: function () {
      if (this._conn.isLoggedIn()) {
        return this._initialize();
      } else {
        return this._$q.reject();
      }
    },

    _initialize: function () {
      // only initialize once
      if (this._initializePromise == null) {
        var p1 = this._fetchUnreadMemberships();
        var p2 = this._fetchMembershipUnreads();
        var self = this;
        // The returned promise will be resolved when the unread
        // have been fetched, not when all memberships have been
        // fetched.
        this._initializePromise = this._$q.all([ p1, p2 ]).then(
          function () {
            // When we have fetched both the unread memberships and
            // the membershipUnreads, then we fetch the full membership list.
            self._registerEvents();
            self._fetchAllMemberships();
            self.enableAutoRefresh();
            self._$log.log(self._logPrefix + "initialize() - success");
          },
          function () {
            // if the initialize fails, remove the stored promise.
            self._$log.log(self._logPrefix + "initialize() - error");
            self._initializePromise = null;
            return self._$q.reject();
          });
      }
      return this._initializePromise;
    },
    
    _registerEvents : function () {
      var conn = this._conn;
      var self = this;
      conn.on('jskom:session:created', function ($event) {
        self._$log.log(self._logPrefix + 'on(jskom:session:created)');
        self.reset();
      });
      
      conn.on('jskom:session:changed', function ($event) {
        self._$log.log(self._logPrefix + 'on(jskom:session:changed)');
        self.reset();
      });
      
      conn.on('jskom:session:deleted', function ($event) {
        self._$log.log(self._logPrefix + 'on(jskom:session:deleted)');
        self.reset();
      });
      
      conn.on('jskom:readMarking:created', function ($event, text) {
        self._$log.log(self._logPrefix + 'on(jskom:readMarking:created)');
        var recipientConfNos = _.map(text.recipient_list, function (r) {
          return r.recpt.conf_no;
        });
        self._membershipList.markTextAsRead(text.text_no, recipientConfNos);
      });
      
      conn.on('jskom:readMarking:deleted', function ($event, text) {
        self._$log.log(self._logPrefix + 'on(jskom:readMarking:deleted)');
        var recipientConfNos = _.map(text.recipient_list, function (r) {
          return r.recpt.conf_no;
        });
        self._membershipList.markTextAsUnread(text.text_no, recipientConfNos);
      });
      
      conn.on('jskom:membership:created', function ($event, confNo) {
        self._$log.log(self._logPrefix + 'on(jskom:membership:created, ' + confNo + ')');
        self._fetchMembership(confNo);
        self._fetchMembershipUnread(confNo);
      });

      conn.on('jskom:membership:deleted', function ($event, confNo) {
        self._$log.log(self._logPrefix + 'on(jskom:membership:deleted, ' + confNo + ')');
        self._membershipList.deleteMembership(confNo);
      });
      
      conn.on('jskom:membership:changed', function ($event, confNo) {
        self._$log.log(self._logPrefix + 'on(jskom:membership:changed, ' + confNo + ')');
        self._fetchMembership(confNo);
      });

      conn.on('jskom:membershipUnread:changed', function ($event, confNo) {
        self._$log.log(self._logPrefix + 'on(jskom:membershipUnread:changed)');
        self._fetchMembershipUnread(confNo);
      });
      
      conn.on('jskom:text:created', function ($event, textNo, recipientList) {
        self._$log.log(self._logPrefix + 'on(jskom:text:created, ' + textNo + ')');
        var recipientConfNos = _.map(recipientList, function (r) {
          return r.recpt.conf_no;
        });
        self._membershipList.markTextAsUnread(textNo, recipientConfNos);
      });
      
      conn.on('jskom:text:fetched', function ($event, text) {
        self._$log.log(self._logPrefix + 'on(jskom:text:fetched, ' + text.text_no + ')');
        var recipientConfNos = _.map(text.recipient_list, function (r) {
          return r.recpt.conf_no;
        });
      });
    },
    
    _fetchMembershipUnreads: function () {
      // TODO: Make sure we only have one of these requests active
      // at one time.
      
      var logp = this._logPrefix + "getMembershipUnreads() - ";
      var self = this;
      return this._membershipsService.getMembershipUnreads(this._conn).then(
        function (membershipUnreads) {
          self._$log.log(logp + "success");
          self._membershipList.setMembershipUnreads(membershipUnreads);
        },
        function (response) {
          self._$log.log(logp + "error");
          // TODO: can we do anything? should we show a message?
          return self._$q.reject();
        });
    },
    
    _fetchMembershipUnread: function (confNo) {
      var logp = this._logPrefix + "getMembershipUnread(" + confNo + ") - ";
      var self = this;
      return this._membershipsService.getMembershipUnread(this._conn, confNo).then(
        function (membershipUnread) {
          self._$log.log(logp + "success");
          self._membershipList.setMembershipUnread(membershipUnread);
        },
        function (response) {
          self._$log.log(logp + "error");
          // TODO: can we do anything? should we show a message?
          return self._$q.reject();
        });
    },
    
    _fetchUnreadMemberships: function () {
      // TODO: Make sure we only have one of these requests active
      // at one time.
      
      var options = { unread: true };
      var logp = this._logPrefix + "getMemberships(" + angular.toJson(options) + ") - ";
      var self = this;
      return this._membershipsService.getMemberships(this._conn, options).then(
        function (unreadMembershipList) {
          self._$log.log(logp + "success");
          self._membershipList.addMemberships(unreadMembershipList.memberships);
        },
        function (response) {
          self._$log.log(logp + "error");
          // TODO: can we do anything? should we show a message?
          return self._$q.reject();
        });
    },
    
    _fetchAllMemberships: function () {
      // TODO: Make sure we only have one of these requests active
      // at one time.
      let noOfMemberships = 100; // Per request
      let maxNoOfMemberships = 2000;
      this._fetchMemberships(0, noOfMemberships, maxNoOfMemberships);
    },

    _fetchMemberships: function (first, noOfMemberships, maxNoOfMemberships) {
      var logp = this._logPrefix + "getMemberships({ unread: false }) - ";
      var self = this;
      // Fetch a few memberships first for feeling more responsive. After initial, fetch more each time.
      let count = noOfMemberships;
      if (first === 0) {
        count = 20;
      }
      var options = { unread: false, first: first, noOfMemberships: count };
      return this._membershipsService.getMemberships(self._conn, options).then(
        function (membershipList) {
          self._$log.log(logp + "success");
          self._membershipList.addMemberships(membershipList.memberships);
          var nextFirst = first + count;
          if (membershipList.has_more && nextFirst < maxNoOfMemberships) {
            self._fetchMemberships(nextFirst, noOfMemberships, maxNoOfMemberships);
          }
        },
        function (response) {
          self._$log.log(logp + "error");
          // TODO: can we do anything? should we show a message?
          return self._$q.reject();
        });
    },
    
    _fetchMembership: function (confNo) {
      var logp = this._logPrefix + "getMemberships(" + confNo + ") - ";
      var self = this;
      return this._membershipsService.getMembership(this._conn, confNo).then(
        function (membership) {
          self._$log.log(logp + "success");
          self._membershipList.addMembership(membership);
        },
        function (response) {
          self._$log.log(logp + "error");
          // TODO: can we do anything? should we show a message?
          return self._$q.reject();
        });
    },
    
    reset: function () {
      this.disableAutoRefresh();
      this._membershipList.clear();
      this._initializePromise = null;
    },
    
    getMembershipList: function () {
      var self = this;
      return this._initialize().then(function () {
        return self._membershipList;
      });
    },

    _enableAutoRefresh: function () {
      this._$log.log(this._logPrefix + "enabling auto-refresh");

      var defaultIntervalMs = this._refreshIntervalSeconds * 1000;
      var self = this;

      function refresh() {
        self._fetchMembershipUnreads().then(
          function() {
            scheduleRefresh(defaultIntervalMs);
          },
          function() {
            scheduleRefresh(defaultIntervalMs * 2); // failed: delay next attempt
          });
      }

      function scheduleRefresh(refreshIntervalMs) {
        if (self._autoRefreshPromise != null) {
          // If there already is a refresh scheduled, cancel it and schedule a new.
          self._$timeout.cancel(self._autoRefreshPromise);
        }
        self._autoRefreshPromise = self._$timeout(refresh, refreshIntervalMs);
      }

      scheduleRefresh(defaultIntervalMs);
    },
    
    enableAutoRefresh: function () {
      var self = this;
      return this._initialize().then(function () {
        self._enableAutoRefresh();
      });
    },
    
    disableAutoRefresh: function () {
      if (this._autoRefreshPromise != null) {
        this._$log.log(this._logPrefix + "disabling auto-refresh");
        this._$timeout.cancel(this._autoRefreshPromise);
        this._autoRefreshPromise = null;
      }
    },
    
    refreshUnread: function () {
      var self = this;
      return this._initialize().then(function () {
        // Reset auto refresh to delay it for a full interval after
        // this manual refresh.
        self._enableAutoRefresh();
        return self._fetchMembershipUnreads();
      });
    }
  });

  jskom.MembershipListHandler = MembershipListHandler;

})(window.jskom);
