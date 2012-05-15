jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div id="container" class="container-fluid">' +
        '  <hr>' +
        '  <footer>' + 
        '      <p>&copy; Oskar Skoog 2012</p>' +
        '  </footer>' +
        '</div>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'showView', 'showMenuView');
        this.currentView = null;
        this.currentMenuView = null;
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template());
        return this;
    },
    
    showMenuView: function(menuView) {
        if (this.currentMenu !== menuView) {
            if (this.currentMenuView != null) {
                this.currentMenuView.remove();
            }
            this.currentMenuView = menuView;
            this.$el.prepend(this.currentMenuView.render().el);
        }
    },
    
    showView: function(view) {
        if (this.currentView !== view) {
            if (this.currentView != null) {
                this.currentView.remove();
            }
            this.currentView = view;
            this.$('#container').prepend(this.currentView.render().el);
        }
    }
});

jskom.Views.Message = Backbone.View.extend({
    tagName: 'div',
    className: 'alert alert-block',
    
    template: _.template(
        '<a class="close" data-dismiss="alert" href="#">×</a>' +
        '<h4 class="alert-heading">{{ heading }}</h4>' +
        '{{ text }}'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render');
        // todo: level (warning, info, error, etc)
        this.heading = options.heading;
        this.text = options.text;
    },
    
    render: function() {
        this.$el.html(this.template({
            heading: this.heading,
            text: this.text
        }));
        return this;
    }
});

jskom.Views.Login = Backbone.View.extend({
    id: 'login',
    className: 'row-fluid',
    
    template: _.template(
        '<div class="span6">' +
        '  <h2>Login</h2>' + 
        '    <div class="message"></div>' + 
        '    <form>' +
        '      <label>Person name</label>' +
        '      <input type="text" class="span12" name="pers_name" />' +
        '      <label>Password</label>' + 
        '      <input type="password" class="span12" name="password" />' +
        '      <button type="submit" class="btn">Login</button>' +
        '   </form>' +
        '</div>'
    ),
    
    events: {
        'submit form': 'onSubmit'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit');
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template());
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
                    self.model.trigger('login');
                    self.remove();
                },
                error: function(model, resp) {
                    console.log("session.save - error");
                    self.$('button[type=submit]').removeAttr('disabled');
                    
                    // todo: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: resp.responseText
                    }).render().el);
                }
            }
        );
    }
});

jskom.Views.Session = Backbone.View.extend({
    id: 'session',
    
    template: _.template(
        '<div class="row-fluid">' + 
        '  <div class="span8">' +
        '    <h2 class="headline"></h2>' + 
        '    <div class="message"></div>' +
        '    <div id="session-container"></div>' +
        '  </div>' +
        '</div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'authFailed', 'showUnreadConfs', 'showText');
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template());
        return this;
    },
    
    authFailed: function() {
        // the session isn't valid anymore, act like it has been destroyed
        this.model.trigger('destroy');
    },
    
    showUnreadConfs: function() {
        this.$('.headline').text('Unread conferences');
        
        var self = this;
        new jskom.Collections.UnreadConferences().fetch({
            success: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - success");
                var view = new jskom.Views.UnreadConferences({
                    collection: unreadConfs
                });
                self.$('#session-container').empty().append(view.render().el);
            },
            error: function(unreadConfs, resp) {
                console.log("unreadConferences.fetch - error");
                if (resp.status == 401) {
                    self.authFailed();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: resp.responseText
                    }).render().el);
                }
            }
        });
    },
    
    showUnreadTextsInConf: function(conf_no) {
        this.$('.headline').text('Unread texts');
        
        var self = this;
        var readMarkings = new jskom.Collections.ReadMarkings([], { conf_no: conf_no });
        readMarkings.fetch({
            data: { unread: true },
            success: function(collection, resp) {
                console.log("readMarkings.fetch(" + conf_no + ") - success");
                self.$('#session-container').empty();
                
                /*collection.each(function(model) {
                    self.$('#session-container')
                        .append(new jskom.Views.TextLink(
                            { text_no: model.get('text_no') }).render().el);
                });*/
                
                var readQueue = new jskom.Collections.ReadQueue();
                collection.each(function(rm) {
                    readQueue.add(new jskom.Models.ReadQueueItem({
                        text_no: rm.get('text_no')
                    }));
                });

                self.$('#session-container').append(new jskom.Views.Reader({
                    collection: readQueue
                }).render().el);
            },
            error: function(collection, resp) {
                console.log("readMarkings.fetch(" + conf_no + ") - error");
                if (resp.status == 401) {
                    self.authFailed();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: resp.responseText
                    }).render().el);
                }
            }
        });
    },
    
    showText: function(text_no) {
        this.$('.headline').text('Text: ' + text_no);
        
        var self = this;
        new jskom.Models.Text({ text_no: text_no }).fetch({
            success: function(t, resp) {
                console.log("text.fetch - success");
                
                var view = new jskom.Views.ShowText({ model: t });
                self.$('#session-container').empty().append(view.render().el);
        
                self.$el.append(new jskom.Views.MarkAsRead({
                    model: new jskom.Models.GlobalReadMarking({
                        text_no: t.get('text_no')
                    })
                }).render().el);

            },
            error: function(t, resp) {
                console.log("text.fetch - error");
                if (resp.status == 401) {
                    self.authFailed();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: resp.responseText
                    }).render().el);
                }
            }
        });
    }
});

jskom.Views.Reader = Backbone.View.extend({
    template: _.template(
        ''
    ),
    
    initialize: function() {
        _.bindAll(this, 'render');
    },
    
    render: function() {
        this.$el.empty();
        if (this.collection.isEmpty()) {
            this.$el.append("Nothing to read.");
        } else {
            var qi = this.collection.shift();
            var text = new jskom.Models.Text({ text_no: qi.get('text_no') });
            var self = this;
            text.fetch({
                success: function(t, resp) {
                    console.log("text.fetch - success");
                    
                    self.$el.append(
                        new jskom.Views.ShowText({ model: t }).render().el
                    );
                },
                error: function(t, resp) {
                    console.log("text.fetch - error");
                    if (resp.status == 401) {
                        self.authFailed(); // FIXME
                    } else {
                        // TODO: error handling
                        self.$('.message').append(new jskom.Views.Message({
                            heading: 'Error!',
                            text: resp.responseText
                        }).render().el);
                    }
                }
            });
        }
        return this;
    },
    
    next: function() {
        
    }
});

jskom.Views.TextLink = Backbone.View.extend({
    tagName: 'a',
    className: 'textLink',
    
    events: {
        'click': 'onClick'
    },
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'onClick');
        this.text_no = options.text_no;
    },
    
    render: function() {
        this.$el
            .text(this.text_no)
            .attr('href', jskom.router.url('texts/' + this.text_no));
        return this;
    },
    
    onClick: function(e) {
        e.preventDefault();
        jskom.router.showText(this.text_no);
    }
});

jskom.Views.Menu = Backbone.View.extend({
    tagName: 'div',
    id: 'menu',
    
    template: _.template(
        '<div class="navbar navbar-fixed-top">' +
        '  <div class="navbar-inner">' +
        '    <div id="menu-container" class="container-fluid">' +
        '      <a class="brand" href="{{ homeUrl }}">jskom</a>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    ),
    
    rightTemplate: _.template(
        '<div id="menu-right" class="btn-group pull-right">' +
        '  <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">' +
        '    <i class="icon-user"></i> {{ pers_name }}' +
        '    <span class="caret"></span>' +
        '  </a>' +
        '  <ul class="dropdown-menu">' +
        '    <li><a class="logout" href="#">Logout</a></li>' +
        '  </ul>' +
        '</div>'
    ),
    
    events: {
        'click #menu-nav a.home': 'onClickHome',
        'click #menu-right a.logout ': 'onClickLogout'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onClickHome');
        this.model.on('change', this.render, this);
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template({ homeUrl: jskom.router.url('') }));
        
        if (!this.model.isNew()) { // is this a correct check?
            this.$('#menu-container').append(this.rightTemplate(this.model.toJSON()));
        }
        
        return this;
    },
    
    onClickHome: function(e) {
        e.preventDefault();
        jskom.router.home();
    },
    
    onClickLogout: function(e) {
        e.preventDefault();
        this.model.destroy();
    }
});

jskom.Views.UnreadConferences = Backbone.View.extend({
    tagName: 'ul',
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne');
        // This is so we can modify the list without having to redraw the entire list
        this.collection.on('add', this.addOne);
    },
    
    render: function() {
        this.$el.empty();
        this.addAll();
        return this;
    },
    
    addAll: function() {
        if (this.collection.length > 0) {
            this.collection.each(this.addOne);
        } else {
            this.$el.append("<li>Nothing unread.</li>");
        }
    },
    
    addOne: function(model) {
        view = new jskom.Views.UnreadConference({ model: model });
        view.render();
        this.$el.append(view.el);
        model.on('remove', view.remove);
    }
});

jskom.Views.UnreadConference = Backbone.View.extend({
    tagName: 'li',
    
    template: _.template(
        '<span class="name">' +
        '  <a class="conf" href="{{ conf_url }}">{{ name }}</a>' +  // FIXME: href
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
        '  <span class="text-link">{{ model.text_no }}</span>' +
        '  / {{ model.creation_time }} / {{ model.author.pers_name }}' +
        '</div>' +
            
        '{{ comment_tos }}' +
        '{{ recipients }}' +
        
        '<div>' +
        '  subject: {{ model.subject }}' +
        '</div>' +
        '<div class="well">{{ body }}</div>' +
        '{{ comment_ins }}'
    ),
    
    commentToTemplate: _.template(
        '<div>{{ type }} to text <span class="text-link">{{ text_no }}</span> by {{ author.pers_name }}</div>'
    ),
    recipientTemplate: _.template(
        '<div>{{ type }}: {{ recpt.conf_name }}</div>'
    ),
    commentInTemplate: _.template(
        '<div>{{ type }} in text <span class="text-link">{{ text_no }}</span> by {{ author.pers_name }}</div>'
    ),
    
    initialize: function() {
        _.bindAll(this, 'render');
    },
    
    render: function() {
        var modelJson = this.model.toJSON();
        
        var comment_tos = _.reduce(this.model.get('comment_to_list'), function(memo, ct) {
            return memo + this.commentToTemplate(ct);
        }, "", this);
        
        var recipients = _.reduce(this.model.get('recipient_list'), function(memo, r) {
            return memo + this.recipientTemplate(r);
        }, "", this);
        
        var comment_ins = _.reduce(this.model.get('comment_in_list'), function(memo, ci) {
            return memo + this.commentInTemplate(ci);
        }, "", this);
        
        this.$el.empty();
        this.$el.append(this.template({
            model: this.model.toJSON(),
            body: this.model.get('body').replace(/\r?\n|\r/g, "<br>"),
            comment_tos: comment_tos,
            recipients: recipients,
            comment_ins: comment_ins
        }));
        
        this.$(".text-link").each(function() {
            var text_no =  $(this).text();
            $(this).empty().append(new jskom.Views.TextLink({ text_no: text_no }).render().el);
        });
        return this;
    },
});

jskom.Views.MarkAsRead = Backbone.View.extend({
    tagName: 'div',
    
    template: _.template(
        '<form>' +
        '  <button class="btn" type="submit">Mark as read</button>' +
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
