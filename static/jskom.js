_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    Models: {},
    Collections: {},
    Views: {},
    Controllers: {},
    
    init: function() {
        //jskom.vent = _.extend({}, Backbone.Events); // event aggregator
        
        new jskom.Controllers.MainController();
        
        // debug
        //jskom.vent.on('all', function(eventName) {
        //    console.log("vent: " + eventName);
        //});
    }
};

$(function() {
    jskom.init();
});


jskom.Controllers.MainController = function(options) {
    options || (options = {});
    this.initialize.apply(this, arguments);
};

_.extend(jskom.Controllers.MainController.prototype, {
    initialize: function(options) {
        this.layout = new jskom.Views.Layout().render();
        this.appView = null;
        this._checkCurrentSession();
    },
    
    _checkCurrentSession: function() {
        var cookieSessionId = jskom.Models.Session.getSessionIdFromCookie();
        var currentSession = new jskom.Models.Session({ id: cookieSessionId });
        var self = this;
        currentSession.fetch({
            success: function(session, resp) {
                session.on('destroy', function() {
                    console.log("session.destroy");
                    self.showLogin();
                });
                console.log("currentSession.fetch - success");
                self.appView = new jskom.Views.App({ model: session });
                self.layout.showView(self.appView);
                self.showHome();
            },
            error: function(session, resp) {
                console.log("currentSession.fetch - error");
                self.showLogin();
            }
        });
    },
    
    showHome: function() {
        var unreadConferences = new jskom.Collections.UnreadConferences();
        var self = this;
        unreadConferences.fetch({
            success: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - success");
                self.appView.showUnreadConferences(unreadConfs);
            },
            error: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - error");
                if (resp.status == 401) self.showLogin();
                // TODO: error handling
                //jskom.vent.trigger('message:error', resp.responseText);
            }
        });
    },
    
    showLogin: function() {
        this.appView = null;
        
        var session = new jskom.Models.Session();
        var loginView = new jskom.Views.Login({ model: session });
        var self = this;
        session.on('sync', function(msg) {
            console.log("session.sync");
            self.appView = new jskom.Views.App({ model: session });
            self.layout.showView(self.appView);
            self.showHome();
        });
        session.on('destroy', function() {
            console.log("session.destroy");
            self.showLogin();
        });
        this.layout.showView(loginView);
    },
    
    showText: function(text_no) {
        var text = new jskom.Models.Text({ text_no: text_no });
        var self = this;
        text.fetch({
            success: function(t, resp) {
                console.log("text.fetch - success");
                
                self.appView.showText(t);
            },
            error: function(t, resp) {
                console.log("text.fetch - error");
                if (resp.status == 401) self.showLogin();
                // TODO: error handling
            }
        });
    }
});

jskom.Models.Session = Backbone.Model.extend({
    url: function() {
        var base = '/sessions/';
        if (this.isNew()) return base;
        return base + this.id;
    },
    
    defaults: {
        username: null,
        password: null, // TODO: Somehow not store password in model
        pers_no: null
    },
},
{
    // Class methods here
    
    getSessionIdFromCookie: function() {
        var session_id = $.cookie('session_id')
        console.log("getSessionIdFromCookie: " + session_id)
        return session_id;
    }
});

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

jskom.Views.Layout = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div id="header"><h1>jskom</h1></div>' +
        '<div id="container"></div>' +
        '<div id="footer">jskom by <a href="mailto:oskar@osd.se">Oskar Skoog</a></div>'
    ),
    
    initialize: function() {
        _.bindAll(this, 'render', 'showView');
        this.currentView = null;
    },
    
    render: function() {
        this.$el
            .empty()
            .append(this.template());
        if (this.currentView != null) {
            this.$('#container').append(this.currentView.render().el);
        }
        return this;
    },
    
    showView: function(view) {
        if (this.currentView !== view) {
            if (this.currentView != null) {
                this.currentView.remove();
            }
            this.currentView = view;
            this.render();
        }
    }
});

jskom.Views.App = Backbone.View.extend({
    template: _.template(
        '<div id="menu"></div>' +
        '<div id="main"></div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render');
    },
    
    render: function() {
        this.$el.empty().append(this.template());
        
        var logoutView = new jskom.Views.Logout({ model: this.model });
        this.$('#menu').append(logoutView.render().el);
        
        return this;
    },
    
    showUnreadConferences: function(unreadConfs) {
        var view = new jskom.Views.UnreadConferences({
            collection: unreadConfs
        });
        this.$('#main').empty().append(view.render().el);
    },
    
    showText: function(text) {
        var view = new jskom.Views.ShowText({ model: text });
        this.$('#main').empty().append(view.render().el);
    }
});

jskom.Views.ShowText = Backbone.View.extend({
    template: _.template(
        '<div>' +
        '  Text Number: {{ text_no }}' +
        '</div>' +
        '<div>' +
        '  Author: {{ author.pers_name }} ({{ author.pers_no }})' +
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
        '<h2>Login</h2>' + 
        '<form>' +
        '  Username: <input type="text" name="username" value="" />' +
        '  <br/>' + 
        '  Password: <input type="password" name="password" value="" />' +
        '  <br/>' + 
        '  <button type="submit">Login</button>' +
        '</form>'
    ),
    
    events: {
        'submit form': 'onSubmit'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit', 'remove');
    },
    
    onSubmit: function(e) {
        e.preventDefault();
        var username = this.$('input[name=username]').val();
        var password = this.$('input[name=password]').val();
        var self = this;
        this.model.on('sync', this.remove, this);
        this.$('button[type=submit]').attr('disabled', 'disabled');
        this.model.save(
            { username: username, password: password },
            {
                error: function(session, resp) {
                    console.log("session.save - error");
                    self.$('button[type=submit]').removeAttr('disabled');
                    
                // tood: Show error message
                }
            }
        );
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
        '<form>' +
        '  <button type="submit">Logout</button>' +
        '</form>'
    ),
    
    events: {
        'submit form': 'onSubmit'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit');
    },
    
    onSubmit: function(e){
        e.preventDefault();
        this.model.destroy();
    },
    
    render: function() {
        this.$el.html(this.template());
        return this;
    },
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
