_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    Models: {},
    Collections: {},
    Views: {},
    init: function() {
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
        var base = '/texts';
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id;
    },
    defaults: {
        text_no: null,
        subject: null,
        body: null
    }
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
        //this.navigate("login", { trigger: true });
        var appView = new jskom.Views.App();
        $('body').append(appView.render().el);
    },
    
    login: function() {
        console.log("route - login");
        var loginView = new jskom.Views.Login();
        jskom.view.$el.empty();
        jskom.view.$el.append(loginView.render().el);
    },
    
    logout: function() {
        console.log("route - logout");
        var logoutView = new jskom.Views.Logout();
        jskom.view.$el.empty();
        jskom.view.$el.append(logoutView.render().el);
    },
    
    getText: function(text_no) {
        console.log("route - getText(" + text_no + ")");
        var text = new jskom.Models.Text({ text_no: text_no });
        text.fetch({
            success: function(model, resp) {
                console.log("getText - success");
                var showTextView = new jskom.Views.ShowText({ model: text });
                jskom.view.$el.empty();
                jskom.view.$el.append(showTextView.render().el);
            },
            error: function(model, resp) {
                console.log("getText - error");
                console.log(resp);
                if (resp.status == 403) jskom.app.navigate("login", { trigger: true });
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
        // TODO: Can't we just send in the model?
        $(this.el).empty().html(this.template({
            text_no: this.model.get('text_no'),
            subject: this.model.get('subject'),
            body: this.model.get('body')
        }));
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
            url: '/auth/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ "username": username, "password": password })
        })
            .done(function() { jskom.app.navigate("", { trigger: true }); })
            .fail(function() { alert("error"); });
    },
    
    render: function () {
        $(this.el).empty().html(this.template());
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
            url: '/auth/logout',
            type: 'POST',
            contentType: 'application/json',
            data: '',
            statusCode: {
                403: function() {
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
        $(this.el).empty().html(this.template());
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

/*
GDS.Views.Entities.Companies = Backbone.View.extend({
    template: _.template(
        '<h2>Companies</h2>' + 
        '<ul></ul>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne');
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
        var view = new GDS.Views.Entities.Company({model: model});
        view.render();
        $('ul', this.el).append(view.el);
        model.bind('remove', view.remove);
    }
});

GDS.Models.Game = Backbone.Model.extend({
    defaults: {
        year: 0,
        month: 0,
        week: 0,
        day: 0,
    },
    
    initialize: function() {
    },
    
    tick: function() {
        this._advanceCalendar();
    },
    
    _advanceCalendar: function() {
        ++this.day;
        if (this.day % 7 == 0) {
            this.day = 0;
            ++this.week;
        }
        if (this.week % 4 == 0) {
            this.week = 0;
            ++this.month;
        }
        if (this.month % 12 == 0) {
            this.month = 0;
            ++this.year;
        }
    }
});


$(function() {
    var companies = new GDS.Collections.Entities.Companies([
        { name: 'Electronic Arts', money: 123456 },
        { name: 'Valve', money: 23456 },
        { name: 'Blizzard', money: 34567 },
    ]);
    new GDS.Views.Entities.Companies({
        collection: companies, el: $('#companies')
    }).render();
});
*/