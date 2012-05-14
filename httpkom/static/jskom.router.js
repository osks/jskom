jskom.Router = Backbone.Router.extend({
    routes: {
        "": "home",
        "login": "login",
        "texts/:text_no": "showText"
        //"conferences/:conf_no": "",
        //"conferences/:conf_no/unread": "search"
    },
    
    initialize: function(options) {
        this.app = new jskom.Views.App();
        this._setUpSession(options.currentSession);
    },
    
    login: function() {
        console.log('route - login');
        this.navigate('login', { trigger: false, replace: true });
        
        var session = new jskom.Models.Session()
        var loginView = new jskom.Views.Login({ model: session });
        loginView.on('login', function() {
            console.log("on login");
            this._setUpSession(session);
            this.home();
        }, this);
        
        this.app.showView(loginView);
    },
    
    home: function() {
        console.log('route - home');
        this.navigate('');
        
        this._withSessionView(function(sessionView) {
            sessionView.showUnreadConfs();
        });
    },
    
    showText: function(text_no) {
        console.log('route - showText(' + text_no + ')');
        this.navigate('texts/' + text_no);
        
        this._withSessionView(function(sessionView) {
            sessionView.showText(text_no);
        });
    },
    
    _withSessionView: function(callback) {
        if (this.sessionView) {
            console.log('_withSessionView - has sessionView');
            callback(this.sessionView);
            this.app.showView(this.sessionView);
        } else {
            console.log('_withSessionView - no sessionView');
            this.login();
        }
    },
    
    _isLoggedIn: function() {
        if (this.currentSession) {
            return true;
        } else {
            return false;
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
