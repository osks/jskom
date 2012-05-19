jskom.Router = Backbone.Router.extend({
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
        this.app = new jskom.Views.App().render();
    },
    
    url: function(path) {
        return this.urlRoot + path;
    },
    
    
    
    login: function() {
        console.log('route - login');
        this.navigate('login', { replace: true });
        if (this.session) {
            this.session.destroy({ silent: true }); // destroy / logout any existing session
        }
        this.session = new jskom.Models.Session();
        this.sessionView = null;
        this._setUpSession(this.session);
        this.app.showMenuView(new jskom.Views.Menu({ model: this.session }));
        this.app.showView(new jskom.Views.Login({ model: this.session }));
    },
    
    home: function() {
        console.log('route - home');
        this.navigate('');
        
        this._withSessionView(function() {
            this.showUnreadConfs();
        });
    },
    
    newText: function() {
        console.log('route - newText');
        this.navigate('texts/new');
        
        this._withSessionView(function() {
            this.newText();
        });
    },
    
    showText: function(text_no) {
        console.log('route - showText(' + text_no + ')');
        this.navigate('texts/' + text_no);
        
        this._withSessionView(function() {
            this.showText(text_no);
        });
    },
    
    showUnreadTextsInConf: function(conf_no) {
        console.log('route - showUnreadInConf(' + conf_no + ')');
        this.navigate("conferences/" + conf_no + "/unread");
        
        this._withSessionView(function() {
            this.showUnreadTextsInConf(conf_no);
        });
    },
    
    
    
    _setUpSession: function(session) {
        session.on('login', function() {
            console.log("on login");
            this.navigate('', { replace: true });
            this.home();
        }, this);
    },
    
    _withSessionView: function(callback) {
        if (!this.session || this.session.isNew()) {
            //console.log('_withSessionView - session is new');
            this.login();
        } else {
            //console.log('_withSessionView - session is not new');
            if (!this.sessionView) {
                this.sessionView = new jskom.Views.Session({ model: this.session })
                this.app.showMenuView(new jskom.Views.Menu({ model: this.session }));
                this.app.showView(this.sessionView);
            }
            callback.call(this.sessionView);
        }
    },
});
