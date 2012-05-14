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
        '<div class="message"></div>' + 
        '<div id="main"></div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'authFailed', 'showUnreadConfs', 'showText');
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.empty();
        
        this.$el.append(
            new jskom.Views.Menu({ model: this.model }).render().el);
        
        this.$el.append(
            this.template());
        
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
                if (jqXHR.status == 401) {
                    self.authFailed();
                }
                // TODO: error handling
            }
        });
    },
    
    showUnreadTextsInConf: function(conf_no) {
        var self = this;
        /*$.ajax('/conferences/' + conf_no + '/read-markings/', {
            type: 'GET',
            data: { unread: true },
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                console.log("showUnreadInConf(" + conf_no + ") - success");
                console.log(data.text_nos);
                self.$('#main').empty().append('<pre>' + JSON.stringify(data.text_nos) + '</pre>');
            },
            error: function(jqXHR, textStatus, errorThrown) {success
                console.log("showUnreadInConf(" + conf_no + ") - error");
                if (jqXHR.status == 401) {
                    self.authFailed();
                } else {
                    self.$('.message').html(jqXHR.responseText).show();
                }
            }
        });*/
        
        
        var readMarkings = new jskom.Collections.ReadMarkings([], { conf_no: conf_no });
        readMarkings.fetch({
            data: { unread: true },
            success: function(collection, resp) {
                console.log("readMarkings.fetch(" + conf_no + ") - success");
                self.$('#main').empty();
                // TODO: real views, so we can get nice click handling and stuff.
                // perhaps a generic "TextLink" view?
                collection.each(function(model) {
                    self.$('#main')
                        .append(new jskom.Views.TextLink({ model: model }).render().el);
                });
                // TODO: real views
            },
            error: function(collection, resp) {
                console.log("readMarkings.fetch(" + conf_no + ") - error");
                if (jqXHR.status == 401) {
                    self.authFailed();
                } else {
                    self.$('.message').html(resp.responseText).show();
                    // TODO: error handling
                }
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
                if (jqXHR.status == 401) {
                    self.authFailed();
                } else {
                    self.$('.message').html(resp.responseText).show();
                    // TODO: error handling
                }
            }
        });
    }
});

jskom.Views.TextLink = Backbone.View.extend({
    // Works for any model that has an attribute called 'text_no'
    tagName: 'a',
    className: 'textLink',
    
    events: {
        'click': 'onClick'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onClick');
    },
    
    render: function() {
        this.$el
            .text(this.model.get('text_no'))
            .attr('href', jskom.router.url('texts/' + this.model.get('text_no')));
        return this;
    },
    
    onClick: function(e) {
        e.preventDefault();
        jskom.router.showText(this.model.get('text_no'));
    }
});

jskom.Views.Menu = Backbone.View.extend({
    tagName: 'div',
    id: 'menu',
    
    template: _.template(
        '<ul></ul>'
    ),
    
    events: {
        'click a.home': 'onClickHome'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onClickHome');
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.html(this.template());
        
        this.$('ul').append(
            $('<li></li>').append(
                $('<a class="home">Home</a>').attr('href', jskom.router.url(''))));
        
        this.$('ul').append(
            $('<li></li>').append(
                new jskom.Views.Logout({ model: this.model }).render().el));
        
        return this;
    },
    
    onClickHome: function(e) {
        e.preventDefault();
        jskom.router.home();
    }
});

jskom.Views.Logout = Backbone.View.extend({
    tagName: 'div',
    className: 'logout',
    
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
        '<a class="conf" href="{{ conf_url }}">{{ name }}</a>' +  // FIXME: href
        '</span> ' +
        '(<span class="no_of_unread">{{ no_of_unread }}</span>)'
    ),
    
    events: {
        'click a.conf': 'onClick',
    },
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'onClick');
        this.model.on('destroy', this.remove);
    },
    
    render: function() {
        var modelJson = this.model.toJSON();
        modelJson.conf_url = jskom.router.url('conferences/' + modelJson.conf_no + '/unread');
        this.$el.html(this.template(modelJson));
        return this;
    },
    
    onClick: function(e) {
        e.preventDefault();
        jskom.router.showUnreadTextsInConf(this.model.get('conf_no'));
    }
});

jskom.Views.ShowText = Backbone.View.extend({
    className: 'text',
    
    template: _.template(
        '<div>' +
        '  {{ text_no }} / {{ creation_time }} / {{ author.pers_name }}' +
        '</div>' +
            
        '{{ comment_tos }}' +
        '{{ recipients }}' +
        
        '<div>' +
        '  subject: {{ subject }}' +
        '</div>' +
        '<div>' +
        '  <pre>{{ body }}</pre>' +
        '</div>' +
        '{{ comment_ins }}'
    ),
    
    commentToTemplate: _.template(
        '<div>{{ type }} to text {{ text_no }} by {{ author.pers_name }}</div>'
    ),
    recipientTemplate: _.template(
        '<div>{{ type }}: {{ recpt.conf_name }}</div>'
    ),
    commentInTemplate: _.template(
        '<div>{{ type }} in text {{ text_no }} by {{ author.pers_name }}</div>'
    ),
    
    initialize: function() {
        _.bindAll(this, 'render');
    },
    
    render: function() {
        var modelJson = this.model.toJSON();
        
        modelJson.comment_tos = _.reduce(this.model.get('comment_to_list'), function(memo, ct) {
            return memo + this.commentToTemplate(ct);
        }, "", this);
        
        modelJson.recipients = _.reduce(this.model.get('recipient_list'), function(memo, r) {
            return memo + this.recipientTemplate(r);
        }, "", this);
        
        modelJson.comment_ins = _.reduce(this.model.get('comment_in_list'), function(memo, ci) {
            return memo + this.commentInTemplate(ci);
        }, "", this);
        
        this.$el.empty();
        this.$el.append(this.template(modelJson));
        
        this.$el.append(new jskom.Views.MarkAsRead({
            model: new jskom.Models.GlobalReadMarking({ text_no: this.model.get('text_no') })
        }).render().el);
        return this;
    },
});

jskom.Views.MarkAsRead = Backbone.View.extend({
    tagName: 'div',
    className: 'markAsRead',
    
    template: _.template(
        '<form>' +
        '  <button type="submit">Mark as read</button>' +
        '</form>'
    ),
    
    events: {
        'submit form': 'onSubmit'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit');
    },
    
    onSubmit: function(e) {
        e.preventDefault();
        var self = this;
        this.model.save({}, {
            success: function(model, resp) {
                self.remove();
            },
            error: function(model, resp) {
                // what, can things fail?
                self.$el.append('(error: ' + resp.responseText + ')');
            }
        });
    },
    
    render: function() {
        this.$el.html(this.template());
        return this;
    },
});
