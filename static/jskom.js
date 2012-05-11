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
        jskom.app = new jskom.Router();
        jskom.view = new jskom.Views.App().render();
        Backbone.history.start({pushState: true, root: "/jskom/"});
    }
};

$(function() {
    jskom.init();
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


jskom.Router = Backbone.Router.extend({
    routes: {
        "": "index",
        "login": "login",
        "logout": "logout",
        "texts/:text_no": "getText",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function() {
        // basically 404
        this.navigate("");
    },
 
    index: function () {
        console.log("route - index");
        
        jskom.unreadConferences.fetch({
            success: function(collection, resp) {
                console.log("get unread confs - success");
                var view = new jskom.Views.UnreadConferences({
                    collection: collection
                });
                jskom.view.$el.empty();
                jskom.view.$el.append(view.render().el);
            },
            error: function(model, resp) {
                console.log("get unread confs - error");
                if (resp.status == 401) jskom.app.navigate("login", { trigger: true });
                // TODO: error handling
            }
        });
    },
    
    login: function() {
        console.log("route - login");
        var view = new jskom.Views.Login();
        jskom.view.$el.empty();
        jskom.view.$el.append(view.render().el);
    },
    
    logout: function() {
        console.log("route - logout");
        var view = new jskom.Views.Logout();
        jskom.view.$el.empty();
        jskom.view.$el.append(view.render().el);
    },
    
    getText: function(text_no) {
        console.log("route - getText(" + text_no + ")");
        var text = new jskom.Models.Text({ text_no: text_no });
        text.fetch({
            success: function(model, resp) {
                console.log("getText - success");
                var view = new jskom.Views.ShowText({ model: text });
                jskom.view.$el.empty();
                jskom.view.$el.append(view.render().el);
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

jskom.Views.UnreadConferences = Backbone.View.extend({
    template: _.template(
        '<h2>Unread Conferences</h2>' +
        '<ul>' + 
        '</ul>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne');
        // This is so we can modify the list without having to redraw the entire list
        this.collection.bind('add', this.addOne);
    },
    
    render: function() {
        $(this.el).html(this.template());
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
        model.bind('remove', view.remove);
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
        this.model.bind('change', this.render);
        this.model.bind('destroy', this.remove);
    },
    
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
    remove: function() {
        this.$el.remove();
    }
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

    initialize: function () {
    },
    
    events: {
        'submit form.login': 'onLoginSubmit'
    },

    onLoginSubmit: function(e){
        e.preventDefault();
        var username = this.$('input[name=username]').val();
        var password = this.$('input[name=password]').val();
        $.ajax({
            url: '/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ "username": username, "password": password })
        })
            .done(function() { jskom.app.navigate("", { trigger: true }); })
            .fail(function() { alert("error"); });
    },
    
    render: function () {
        $(this.el).html(this.template());
        return this;
    } 
});

jskom.Views.Logout = Backbone.View.extend({
    template: _.template(
        '<form class="logout">' +
        '  <button type="submit">Logout</button>' +
        '</form>'
    ),

    initialize: function () {
    },
    
    events: {
        'submit form.logout': 'onLogoutSubmit'
    },

    onLogoutSubmit: function(e){
        e.preventDefault();
        $.ajax({
            url: '/logout',
            type: 'POST',
            contentType: 'application/json',
            data: '',
            statusCode: {
                401: function() {
                    // Already logged out
                    jskom.app.navigate("login", { trigger: true });
                },
                204: function() {
                    jskom.app.navigate("login", { trigger: true });
                }
            }
        });
    },
    
    render: function () {
        $(this.el).html(this.template());
        return this;
    } 
});

jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    initialize: function () {
    },
    
    events: {
    },

    render: function () {
        $(this.el).empty();
        return this;
    } 
});
