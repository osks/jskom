// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";

(function($, _, Backbone, Handlebars, Routers, Models, Collections, Views, Log, Settings) {
    
    Routers.AppRouter = Backbone.Router.extend({
        routes: {
            "": "home",
            "login": "login",
            "texts/new": "newText",
            "texts/:text_no": "showText",
            //"conferences/:conf_no": "foo",
            "conferences/:conf_no/unread": "showUnreadTextsInConf",
            "*path": "home"
        },
        
        initialize: function(options) {
            this.session = options.currentSession;
            this._setUpSession(this.session);
            this.urlRoot = options.urlRoot;
            
            this.sessionView = null;
            this.app = new Views.App().render();
        },
        
        url: function(path) {
            return this.urlRoot + path;
        },
        
        
        
        login: function() {
            Log.debug('route - login');
            this.navigate('login', { replace: true });
            if (this.session) {
                this.session.destroy({ silent: true }); // destroy / logout any existing session
            }
            this.session = new Models.Session({ prefetchCount: 2 });
            this.sessionView = null;
            this._setUpSession(this.session);
            this.app.showMenuView(new Views.Menu({ model: this.session }));
            this.app.showView(new Views.Login({ model: this.session }));
        },
        
        home: function() {
            Log.debug('route - home');
            this.navigate('');
            
            this._withSessionView(function() {
                this.showUnreadConfs();
            });
        },
        
        newText: function() {
            Log.debug('route - newText');
            this.navigate('texts/new');
            
            this._withSessionView(function() {
                this.newText();
            });
        },
        
        showText: function(text_no) {
            Log.debug('route - showText(' + text_no + ')');
            this.navigate('texts/' + text_no);
            
            this._withSessionView(function() {
                this.showText(text_no);
            });
        },
        
        showUnreadTextsInConf: function(conf_no) {
            Log.debug('route - showUnreadInConf(' + conf_no + ')');
            this.navigate("conferences/" + conf_no + "/unread");
            
            this._withSessionView(function() {
                this.showUnreadTextsInConf(conf_no);
            });
        },
        
        
        
        _setUpSession: function(session) {
            session.on('login', function() {
                Log.debug("on login");
                this.navigate('', { replace: true });
                this.home();
            }, this);
        },
        
        _withSessionView: function(callback) {
            if (!this.session || this.session.isNew()) {
                //Log.debug('_withSessionView - session is new');
                this.login();
            } else {
                //Log.debug('_withSessionView - session is not new');
                if (!this.sessionView) {
                    this.sessionView = new Views.Session({ model: this.session })
                    this.app.showMenuView(new Views.Menu({ model: this.session }));
                    this.app.showView(this.sessionView);
                }
                callback.call(this.sessionView);
            }
        },
    });

})(jQuery, _, Backbone, Handlebars, jskom.Routers, jskom.Models, jskom.Collections,
   jskom.Views, jskom.Log, jskom.Settings);
