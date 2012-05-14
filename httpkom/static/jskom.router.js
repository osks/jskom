jskom.Router = Backbone.Router.extend({
    routes: {
        "": "home",
        "login": "login",
        "texts/:text_no": "showText",
        //"conferences/:conf_no": "foo",
        "conferences/:conf_no/unread": "showUnreadTextsInConf",
        "*path": "home"
    },
    
    initialize: function(options) {
        this.app = new jskom.Views.App();
        this.urlRoot = options.urlRoot;
        this._setUpSession(options.currentSession);
    },
    
    url: function(path) {
        return this.urlRoot + path;
    },
    
    login: function() {
        console.log('route - login');
        this.navigate('login', { replace: true });
        
        var session = new jskom.Models.Session();
        var loginView = new jskom.Views.Login({ model: session });
        loginView.on('login', function() {
            console.log("on login");
            this._setUpSession(session);
            this.navigate('', { replace: true });
            this.home();
        }, this);
        
        this.app.showView(loginView);
    },
    
    home: function() {
        console.log('route - home');
        this.navigate('');
        
        this._withSessionView(function() {
            this.showUnreadConfs();
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
    
    
    
    _withSessionView: function(callback) {
        if (this.sessionView) {
            //console.log('_withSessionView - has sessionView');
            
            this.app.showView(this.sessionView);
            callback.call(this.sessionView);
        } else {
            //console.log('_withSessionView - no sessionView');
            this.login();
        }
    },
    
    _setUpSession: function(session) {
        if (session) {
            this.sessionView = new jskom.Views.Session({ model: session });
            session.on('destroy', function() {
                console.log("on session.destroy");
                this.login();
            }, this);
        } else {
            this.sessionView = null;
        }
    }
});
