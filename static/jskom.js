_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    Models: {},
    Collections: {},
    Views: {},
    init: function() {
        jskom.texts = new jskom.Collections.Texts();
        jskom.unreadConferences = new jskom.Collections.UnreadConferences();
        jskom.vent = _.extend({}, Backbone.Events); // event aggregator
        jskom.app = new jskom.Views.App().render();
        jskom.router = new jskom.Router();
        Backbone.history.start({pushState: true, root: "/jskom/"});
        
        // debug
        jskom.vent.on('all', function(eventName) {
            console.log("vent: " + eventName);
        });
    }
};

jskom.Router = Backbone.Router.extend({
    routes: {
        "": "home",
        "login": "login",
        "texts/:text_no": "getText",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function() {
        // basically 404
        this.navigate("", { trigger: true });
    },
    
    home: function () {
        console.log("route - index");
        jskom.app.showHome();
    },
    
    login: function() {
        console.log("route - login");
        jskom.app.showLogin();
    },
    
    getText: function(text_no) {
        console.log("route - getText(" + text_no + ")");
        var text = new jskom.Models.Text({ text_no: text_no });
        text.fetch({
            success: function(model, resp) {
                console.log("getText - success");
                var view = new jskom.Views.ShowText({ model: text });
                jskom.app.$el.empty();
                jskom.app.$el.append(view.render().el);
            },
            error: function(model, resp) {
                console.log("getText - error");
                console.log(resp);
                if (resp.status == 401) jskom.app.navigate("login", { trigger: true });
                // TODO: error handling
            }
        });
    }
});

jskom.isLoggedIn = function(options) {
    options || (options = {});
    $.ajax({
        url: '/login',
        type: 'GET',
        success: function(data, textStatus, jqXHR) {
            if (options.success) options.success(data, textStatus, jqXHR);
            
            jskom.vent.trigger('loggedin:true');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (options.error) options.error(jqXHR, textStatus, errorThrown);
            
            jskom.vent.trigger('loggedin:false');
        }
    });
}

jskom.login = function(username, password, options) {
    options || (options = {});
    $.ajax({
        url: '/login',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ "username": username, "password": password }),
        success: function(data, textStatus, jqXHR) {
            if (options.success) options.success(data, textStatus, jqXHR);
            
            jskom.vent.trigger('login:success');
            jskom.vent.trigger('loggedin:true');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (options.error) options.error(jqXHR, textStatus, errorThrown);
            
            jskom.vent.trigger('login:failure');
        }
    });
}

jskom.logout = function(options) {
    options || (options = {});
    $.ajax({
        url: '/logout',
        type: 'POST',
        contentType: 'application/json',
        data: '',
        success: function(data, textStatus, jqXHR) {
            if (options.success) options.success(data, textStatus, jqXHR);
            
            jskom.vent.trigger('logout:success');
            jskom.vent.trigger('loggedin:false');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (options.error) options.error(jqXHR, textStatus, errorThrown);
            
            jskom.vent.trigger('logout:failure');
        }
    });
}

jskom.Models.Text = Backbone.Model.extend({
    idAttribute: 'text_no',
    
    url: function() {
        var base = '/texts/';
        if (this.isNew()) return base;
        return base + this.id;
    },
    
    defaults: {
        text_no: null,
        subject: null,
        body: null
    }
});

jskom.Collections.Texts = Backbone.Collection.extend({
    model: jskom.Models.Text,
    url: '/texts/'
});

jskom.Models.UnreadConference = Backbone.Model.extend({
    idAttribute: 'conf_no',
    defaults: {
        conf_no: null,
        name: null
    }
});

jskom.Collections.UnreadConferences = Backbone.Collection.extend({
    model: jskom.Models.UnreadConference,
    url: '/conferences/unread/',
    // Because httkomr doesn't return an array of models by default we need
    // to point Backbone.js at the correct property
    parse: function(resp, xhr) {
        return resp.confs;
    },
});


jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div id="header"><h1>jskom</h1></div>' +
        '<div id="message-area"></div>' +
        '<div id="container"></div>'
    ),
    
    initialize: function () {
        _.bindAll(this, 'render', 'showLogin', 'hideLogin', 'showLogout', 'hideLogout',
                  'showMessage', 'hideMessage');
        this.loginView = null;
        this.logoutView = null;
        
        
        jskom.vent.on('loggedin:true', function() {
            this.showLogout();
        }, this);
        
        jskom.vent.on('loggedin:false', function() {
            jskom.router.navigate("login");
            this.showLogin();
        }, this);
        
        jskom.vent.on('login:success', function() {
            this.hideMessage();
            jskom.router.navigate("");
            this.showHome();
        }, this);
        
        jskom.vent.on('logout:success', function() {
            this.hideMessage();
            jskom.router.navigate("login");
            this.showLogin();
        }, this);
        
        jskom.vent.on('message:error', function(msg) {
            this.showMessage(msg);
        }, this);
    },
    
    events: {
    },

    render: function() {
        this.$el
            .empty()
            .append(this.template());
        
        return this;
    },
    
    showMessage: function(msg) {
        this.$('#message-area').html(msg);
    },
    
    hideMessage: function() {
        this.$('#message-area').html('');
    },
    
    showLogin: function() {
        this.hideLogout();
        if (this.loginView == null) {
            this.loginView = new jskom.Views.Login();
            this.$('#container').empty().append(this.loginView.render().el);
        }
    },
    
    hideLogin: function() {
        if (this.loginView != null) {
            this.loginView.remove();
            this.loginView = null;
        }
    },
    
    showLogout: function() {
        this.hideLogin();
        if (this.logoutView == null) {
            this.logoutView = new jskom.Views.Logout();
            this.$('#header').append(this.logoutView.render().el);
        }
    },
    
    hideLogout: function() {
        if (this.logoutView != null) {
            this.logoutView.remove();
            this.logoutView = null;
        }
    },
    
    showHome: function() {
        this.hideLogin();
        this.showLogout();
        jskom.unreadConferences.fetch({
            success: function(collection, resp) {
                console.log("get unread confs - success");
                var view = new jskom.Views.UnreadConferences({
                    collection: collection
                });
                this.$('#container').empty().append(view.render().el);
            },
            error: function(model, resp) {
                console.log("get unread confs - error");
                if (resp.status == 401) jskom.vent.trigger('loggedin:false');
                // TODO: real error handling
                jskom.vent.trigger('message:error', resp.responseText);
            }
        });
    },
});

jskom.Views.ShowText = Backbone.View.extend({
    template: _.template(
        '<div>' +
        '  Text Number: {{ text_no }}' +
        '</div>' +
        '<div>' +
        '  Subject: {{ subject }}' +
        '</div>' +
        '<div>' +
        '  Body:' +
        '  <pre>{{ body }}</pre>' +
        '</div>'
    ),

    initialize: function() {
        _.bindAll(this, 'render');
    },
    
    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
});

jskom.Views.Login = Backbone.View.extend({
    template: _.template(
        '<form class="login">' +
        '  Username: <input type="text" name="username" value="" />' +
        '  <br/>' + 
        '  Password: <input type="password" name="password" value="" />' +
        '  <br/>' + 
        '  <button type="submit">Login</button>' +
        '</form>'
    ),
    
    events: {
        'submit form.login': 'onLoginSubmit'
    },
    
    initialize: function () {
        _.bindAll(this, 'render', 'onLoginSubmit', 'remove');
    },
    
    onLoginSubmit: function(e){
        e.preventDefault();
        var username = this.$('input[name=username]').val();
        var password = this.$('input[name=password]').val();
        jskom.login(username, password, {
            error: function(jqXHR, textStatus, errorThrown) {
                jskom.vent.trigger('message:error', jqXHR.responseText);
            }
        });
    },
    
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    }
});

jskom.Views.Logout = Backbone.View.extend({
    template: _.template(
        '<form class="logout">' +
        '  <button type="submit">Logout</button>' +
        '</form>'
    ),
    
    events: {
        'submit form.logout': 'onLogoutSubmit'
    },
    
    initialize: function () {
        _.bindAll(this, 'render', 'onLogoutSubmit', 'remove');
    },
    
    onLogoutSubmit: function(e){
        e.preventDefault();
        jskom.logout();
    },
    
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    }
});

jskom.Views.UnreadConferences = Backbone.View.extend({
    template: _.template(
        '<h2>Unread Conferences</h2>' +
        '<ul>' + 
        '</ul>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne');
        // This is so we can modify the list without having to redraw the entire list
        this.collection.on('add', this.addOne);
    },
    
    render: function() {
        this.$el.html(this.template());
        this.addAll();
        return this;
    },
    
    addAll: function() {
        this.collection.each(this.addOne);
    },
    
    addOne: function(model) {
        view = new jskom.Views.UnreadConference({ model: model });
        view.render();
        this.$('ul').append(view.el);
        model.on('remove', view.remove);
    }
});

jskom.Views.UnreadConference = Backbone.View.extend({
    tagName: 'li',
    
    template: _.template(
        '<span class="name">{{ name }}</span> ' +
        '(<span class="no_of_unread">{{ no_of_unread }}</span>)'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'remove');
        this.model.on('change', this.render);
        this.model.on('destroy', this.remove);
    },
    
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    }
});

$(function() {
    jskom.init();
});
