jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div id="header"><h1>jskom</h1></div>' +
        '<div id="container"></div>' +
        '<div id="footer">jskom by <a href="mailto:oskar@osd.se">Oskar Skoog</a></div>'
    ),
    
    initialize: function(options) {
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
        _.bindAll(this, 'render', 'onSubmit');
    },
    
    render: function() {
        this.$el.html(this.template());
        return this;
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
                success: function(model, resp) {
                    self.trigger('login');
                    self.remove();
                },
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

jskom.Views.Session = Backbone.View.extend({
    template: _.template(
        '<div id="menu"></div>' +
        '<div id="main"></div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'authFailed', 'showUnreadConfs', 'showText');
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.empty().append(this.template());
        
        var logoutView = new jskom.Views.Logout({ model: this.model });
        this.$('#menu').append(logoutView.render().el);
        
        return this;
    },
    
    authFailed: function() {
        // the session isn't valid anymore, act like it has been destroyed
        this.model.trigger('destroy');
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
        this.model.on('destroy', this.remove, this);
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
        '<span class="name">' +
        '<a class="conf" href="{{ conf_no }}">{{ name }}</a>' +  // FIXME: href
        '</span> ' +
        '(<span class="no_of_unread">{{ no_of_unread }}</span>)'
    ),
    
    events: {
        'click a.conf': 'showConf',
    },
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'showConf');
        this.model.on('destroy', this.remove);
    },
    
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
    showConf: function() {
        // todo
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
