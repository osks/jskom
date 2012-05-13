_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    Models: {},
    Collections: {},
    Views: {},
    
    init: function() {
        //jskom.vent = _.extend({}, Backbone.Events); // event aggregator
        
        new jskom.Views.App();
        // debug
        //jskom.vent.on('all', function(eventName) {
        //    console.log("vent: " + eventName);
        //});
    }
};

$(function() {
    jskom.init();
});


jskom.Models.Session = Backbone.Model.extend({
    url: function() {
        var base = '/sessions/';
        if (this.isNew()) return base;
        return base + this.id;
    },
    
    defaults: {
        pers_name: null,
        password: null, // TODO: Somehow not store password in model
        pers_no: null
    },
    
    validate: function(attrs) {
        if (!attrs.pers_name) {
            // ugly hack to make them look the same as jqXHR...
            return { responseText: "can't have an empty person name" };
        }
    }
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

jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div id="header"><h1>jskom</h1></div>' +
        '<div id="container"></div>' +
        '<div id="footer">jskom by <a href="mailto:oskar@osd.se">Oskar Skoog</a></div>'
    ),
    
    initialize: function() {
        _.bindAll(this, 'render', 'showView', 'checkCurrentSession', 'showLogin', 'showSession');
        this.currentView = null;
        this.checkCurrentSession();
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
    
    checkCurrentSession: function() {
        var currentSession = new jskom.Models.Session({
            id: jskom.Models.Session.getSessionIdFromCookie()
        });
        if (currentSession.isNew()) {
            this.showLogin();
        } else {
            var self = this;
            currentSession.fetch({
                success: function(session, resp) {
                    console.log("currentSession.fetch - success");
                    self.showSession(session);
                },
                error: function(session, resp) {
                    console.log("currentSession.fetch - error");
                    self.showLogin();
                }
            });
        }
    },
    
    showLogin: function() {
        var session = new jskom.Models.Session();
        var self = this;
        session.on('change', function(msg) {
            console.log("on session.change");
            self.showSession(session);
        });
        var view = new jskom.Views.Login({ model: session });
        this.showView(view);
    },
    
    showSession: function(session) {
        var self = this;
        session.on('destroy', function() {
            console.log("on session.destroy");
            self.showLogin();
        });
        var appView = new jskom.Views.Session({ model: session });
        this.showView(appView);
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

jskom.Views.Session = Backbone.View.extend({
    template: _.template(
        '<div id="menu"></div>' +
        '<div id="main"></div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'remove', 'authFailed', 'showUnreadConfs', 'showText');
        this.showUnreadConfs();
    },
    
    render: function() {
        this.$el.empty().append(this.template());
        
        var logoutView = new jskom.Views.Logout({ model: this.model });
        this.$('#menu').append(logoutView.render().el);
        
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    },
    
    authFailed: function() {
        // TODO: what do we do here?
        // we can't destroy the session, because it might already be destroyed, so
        // how do we make sure the App view removes us? Just remove ourselfs?
        alert("authFailed");
    },
    
    showUnreadConfs: function() {
        var self = this;
        new jskom.Collections.UnreadConferences().fetch({
            success: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - success");
                var view = new jskom.Views.UnreadConferences({
                    collection: unreadConfs
                });
                self.$('#main').empty().append(view.render().el);
            },
            error: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - error");
                if (resp.status == 401) self.authFailed();
                // TODO: error handling
            }
        });
    },
    
    showText: function(text_no) {
        var self = this;
        new jskom.Models.Text({ text_no: text_no }).fetch({
            success: function(t, resp) {
                console.log("text.fetch - success");
                
                var view = new jskom.Views.ShowText({ model: t });
                self.$('#main').empty().append(view.render().el);
            },
            error: function(t, resp) {
                console.log("text.fetch - error");
                if (resp.status == 401) self.authFailed();
                // TODO: error handling
            }
        });
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
        '<div class="message"></div>' + 
        '<form>' +
        '  Person name: <input type="text" name="pers_name" value="" />' +
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
    
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    },
    
    onSubmit: function(e) {
        e.preventDefault();
        var pers_name = this.$('input[name=pers_name]').val();
        var password = this.$('input[name=password]').val();
        this.$('button[type=submit]').attr('disabled', 'disabled');
        var self = this;
        this.model.save(
            { pers_name: pers_name, password: password },
            {
                wait: true,
                error: function(model, resp) {
                    console.log("session.save - error");
                    self.$('button[type=submit]').removeAttr('disabled');
                    
                    // todo: Show error message
                    self.$('.message').html(resp.responseText).show();
                }
            }
        );
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
