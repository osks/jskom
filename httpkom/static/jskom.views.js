jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: _.template(
        '<div class="container">' +
        '  <div id="app-container">' +
        '  </div>' + 
        '  <hr>' +
        '  <footer>' + 
        '      <p>&copy; <a href="mailto:oskar@osd.se">Oskar Skoog</a> 2012</p>' +
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
            this.$('#app-container').prepend(this.currentView.render().el);
        }
    }
});

jskom.Views.Message = Backbone.View.extend({
    tagName: 'div',
    className: 'alert alert-block',
    
    template: _.template(
        '<a class="close" data-dismiss="alert" href="#">×</a>' +
        '<h4 class="alert-heading alert-{{ level }}">{{ heading }}</h4>' +
        '{{ text }}'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render');
        this.level = options.level; // (success, info, warning, error)
        this.heading = options.heading;
        this.text = options.text;
        this.render();
    },
    
    render: function() {
        this.$el.html(this.template({
            level: this.level,
            heading: this.heading,
            text: this.text
        }));
        return this;
    }
});

jskom.Views.Login = Backbone.View.extend({
    id: 'login',
    
    template: _.template(
        '<div class="row">' +
        '  <div class="span4">' +
        '    <h2>Login</h2>' +
        '    <div class="message"></div>' + 
        '    <form>' +
        '      <label>Person name</label>' +
        '      <input type="text" class="span4" name="pers_name" />' +
        '      <label>Password</label>' + 
        '      <input type="password" class="span4" name="password" />' +
        
        '      <div class="form-actions">' +
        '        <button type="submit" class="btn btn-primary">Login</button>' +
        '      </div>' +
        '    </form>' +
        '  </div>' +
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
                    }).el);
                }
            }
        );
    }
});

jskom.Views.Session = Backbone.View.extend({
    id: 'session',
    
    template: _.template(
        '<div class="row">' +
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
        _.bindAll(this, 'render', 'authFailed', 'showUnreadConfs', 'showText', 'newText');
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
                    }).el);
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
                
                var readQueue = new jskom.Collections.ReadQueue([], { prefetchCount: 3 });
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
                    }).el);
                }
            }
        });
    },
    
    showText: function(text_no) {
        this.$('.headline').text('Text: ' + text_no);
        
        var self = this;
        var text = new jskom.Models.Text({ text_no: text_no });
        text.fetch().done(
            function(data) {
                console.log("text.fetch - success");
                
                self.$('#session-container').empty().append(
                    new jskom.Views.ShowText({ model: text }).render().el);
            }
        ).fail(
            function(jqXHR, textStatus) {
                console.log("text.fetch - error");
                
                if (jqXHR.status == 401) {
                    self.authFailed();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: jqXHR.responseText
                    }).el);
                }
            }
        );
    },
    
    newText: function() {
        this.$('.headline').text('New text');
        
        this.$('#session-container')
            .empty()
            .append(new jskom.Views.CreateText({ model: new jskom.Models.Text() }).render().el);
    },
    
});

jskom.Views.Reader = Backbone.View.extend({
    template: _.template(
        '<div class="message"></div>' +
        '<div class="reader-container"></div>' +
        '<div class="reader-controls form-actions">' +
        '  <button class="home btn">Back to conference list</button> ' +
        '</div>'
    ),
    
    nextButtonTemplate: _.template(
        '<button class="next btn btn-primary">Next unread text</button>'
    ),
    
    events: {
        'click .next': 'onNext',
        'click .home': 'onHome'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onNext', 'onHome', 'showText');
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template());
        
        if (this.collection.isEmpty()) {
            this.$('.reader-container').append("Nothing to read.");
        } else {
            var text = this.collection.first().get('text');
            var self = this;
            text.deferredFetch().then(
                function(data) {
                    self.showText(text);
                    
                    // TODO: where should we mark the text as read?  Idea: when it
                    // succeeds, put up a small button somewhere where
                    // one can click to mark the text as unread again.
                    // That means that we should probably not do this
                    // marking in the render() method.  With the
                    // possiblity to mark as unread, it might be fine
                    // to mark them in the moveNext method?
                    //text.markAsReadGlobal(); // error handling?
                },
                function(jqXHR, textStatus) {
                    if (jqXHR.status == 401) {
                        jskom.router.login();
                    } else {
                        // TODO: error handling
                        self.$('.message').append(new jskom.Views.Message({
                            heading: 'Error!',
                            text: jqXHR.responseText
                        }).el);
                    }
                }
            );

            
        }
        
        return this;
    },
    
    showText: function(text) {
        this.$('.reader-container').append(
            new jskom.Views.ShowText({ model: text }).render().el
        );
        
        if (this.collection.length > 1) {
            this.$('.reader-controls').append(this.nextButtonTemplate());
        }
        
        // This is a nice feature, but a bit odd to have the code for this here
        //jskom.router.navigate('texts/' + text.get('text_no'));
    },
    
    onNext: function(e) {
        e.preventDefault();
        this.collection.shift();
        this.render();
    },
    
    onHome: function(e) {
        e.preventDefault();
        jskom.router.home();
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
        '    <div class="container" id="menu-container">' +
        '      <a class="brand" href="{{ home_url }}">jskom</a>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    ),
    
    loggedInMenuTemplate: _.template(
        '<ul class="nav">' +
        '  <li class="active">' +
        '    <a class="home" href="{{ home_url }}">Home</a>' +
        '  </li>' +
        '  <li>' +
        '    <a class="new-text" href="{{ new_text_url }}">New text</a>' +
        '  </li>' +
        '</ul>' +
        '<div class="btn-group pull-right" id="menu-right">' +
        '  <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">' +
        '    <i class="icon-user"></i> {{ model.pers_name }}' +
        '    <span class="caret"></span>' +
        '  </a>' +
        '  <ul class="dropdown-menu">' +
        '    <li><a class="logout" href="#">Logout</a></li>' +
        '  </ul>' +
        '</div>'
    ),
    
    events: {
        'click a.home': 'onClickHome',
        'click a.new-text': 'onClickNewText',
        'click a.logout ': 'onClickLogout'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onClickHome', 'onClickNewText', 'onClickLogout');
        this.model.on('change', this.render, this);
        this.model.on('destroy', this.remove, this);
        
        // TODO: Model for the menu, so we can have active/inactive menu options
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template({ home_url: jskom.router.url('') }));
        
        if (!this.model.isNew()) { // is this a correct check?
            this.$('#menu-container').append(this.loggedInMenuTemplate({
                home_url: jskom.router.url(''),
                new_text_url: jskom.router.url('texts/new'),
                model: this.model.toJSON()
            }));
        }
        
        return this;
    },
    
    onClickHome: function() {
        jskom.router.home();
        return false;
    },
    
    onClickNewText: function() {
        jskom.router.newText();
        return false;
    },
    
    onClickLogout: function(e) {
        this.model.destroy();
        jskom.router.login();
        return false;
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
        if (this.collection.isEmpty()) {
            this.$el.append("<li>Nothing unread.</li>");
        } else {
            this.collection.each(this.addOne);
        }
    },
    
    addOne: function(model) {
        var view = new jskom.Views.UnreadConference({ model: model });
        view.render();
        this.$el.append(view.el);
        model.on('remove', view.remove);
    }
});

jskom.Views.UnreadConference = Backbone.View.extend({
    tagName: 'li',
    
    template: _.template(
        '<span class="name">' +
        '  <a class="conf" href="{{ conf_url }}">{{ name }}</a>' +
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
    },
});


jskom.Views.RecipientList = Backbone.View.extend({
    className: 'recipient_list',
    
    template: _.template(
        '<label>Recipients</label>' +
        '<button class="btn btn-small btn-success add-recipient">' +
        '  Add recipient' +
        '</button>' +
        '<p/>' +
        '<div class="recipients"></div>'
    ),
    
    events: {
        'click .add-recipient': 'addRecipient',
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'addRecipient', 'addAllViews', 'addOneView');
        if (this.collection.isEmpty()) {
            // Always start with at least one recipient
            this.collection.add(new jskom.Models.Recipient({ type: 'to', conf_name: '' }));
        }
        this.collection.on('add', this.addOneView);
    },
    
    render: function() {
        this.$el.empty().append(this.template());
        this.addAllViews();
        return this;
    },
    
    addAllViews: function() {
        this.collection.each(this.addOneView);
    },
    
    addOneView: function(model) {
        var view = new jskom.Views.Recipient({ model: model }).render();
        view.on('model:remove', function() {
            this.collection.remove(model);
        }, this);
        this.$('.recipients').append(view.el).append("<p/>");
        model.on('remove', view.remove, view);
    },
    
    addRecipient: function(e) {
        e.preventDefault();
        this.collection.add(new jskom.Models.Recipient({ type: 'to', conf_name: '' }));
    },
});

jskom.Views.Recipient = Backbone.View.extend({
    tagName: 'fieldset',
    // this part is form-inline, to be able to align button and select correctly
    className: 'recipient row form-inline',
    
    template: _.template(
        '  <div class="span8">' +
        '      <select class="input-small" name="recipient_list.{{index}}.type">' +
        '        <option value="to" {{ to_selected }}>To</option>' +
        '        <option value="cc" {{ cc_selected }}>CC</option>' +
        '        <option value="bcc" {{ bcc_selected }}>BCC</option>' +
        '      </select>' +
        '      <input class="span5" type="text" name="recipient_list.{{index}}.conf_name" ' +
        '             value="{{ model.conf_name }}" />' +
        '      <button class="btn btn-mini btn-danger remove-recipient">Remove"</button>' +
        '  </div>'
    ),
    
    events: {
        'click .remove-recipient': 'removeRecipient',
    },
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'removeRecipient');
    },
    
    render: function() {
        var type = this.model.get('type');
        this.$el.empty().append(this.template({
            index: this.model.cid,
            model: this.model.toJSON(),
            
            to_selected: (type == 'to' ? 'selected="selected"' : ''),
            cc_selected: (type == 'cc' ? 'selected="selected"' : ''),
            bcc_selected: (type == 'bcc' ? 'selected="selected"' : ''),
        }));
        return this;
    },
    
    removeRecipient: function(e) {
        e.preventDefault();
        this.trigger('model:remove', this.model);
    },
});

jskom.Views.CreateText = Backbone.View.extend({
    template: _.template(
        '<div class="message"></div>' +
        '    <form>' +
        
        '      <label>Subject</label>' + 
        '      <input class="span8" type="text" name="subject" value="{{ model.subject }}" />' +
            
        '      <label>Body</label>' +
        '      <textarea class="span8" name="body" rows="5">{{ model.body }}</textarea>' +

        '      <div class="form-actions">' + 
        '        <input type="submit" class="btn btn-primary" value="Post" />' +
        '      </div>' + 
        '   </form>'
    ),
    
    events: {
        'submit form': 'onSubmit',
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit');
    },
    
    render: function() {
        this.$el.empty();
        
        this.$el.append(this.template({
            model: this.model.toJSON()
        }));
        
        this.$('form').prepend(new jskom.Views.RecipientList({
            collection: this.model.get('recipient_list')
        }).render().el);
        
        return this;
    },
    
    onSubmit: function(e) {
        e.preventDefault();
        
        var serializedForm = this.$('form').toObject({ skipEmpty: false });
        
        // Update the recipient list collection
        if (serializedForm.recipient_list) {
            _.each(serializedForm.recipient_list, function(recipient, cid) {
                this.model.get('recipient_list').getByCid(cid).set(recipient);
            }, this);
            delete serializedForm.recipient_list;
        }
        
        var self = this;
        this.model.save(_.extend(serializedForm, {
            content_type: "text/x-kom-basic",
        })).done(
            function(data) {
                console.log("text.save - success");
                self.remove();
                // FIXME: this will break a ReadQueue. Add to read queue instead of go there?
                // But it's fine going there if we just enter the text form nothing.
                jskom.router.showText(self.model.get('text_no'));
            }
        ).fail(
            function(jqXHR, textStatus) {
                console.log("text.save - error");
                // TODO: real error handling
                if (jqXHR.status == 401) {
                    self.$('.message').append(new jskom.Views.Message({
                        level: 'error',
                        heading: 'Unauthorized!',
                        text: "Your session has probably ended."
                    }).el);
                } else {
                    self.$('.message').append(new jskom.Views.Message({
                        level: 'error',
                        heading: 'Error!',
                        text: jqXHR.responseText
                    }).el);
                }
            }
        );
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
        '{{ comment_ins }}' +
        
        '<div class="text-controls">' +
        '  <button class="comment-text btn">Write comment</button>' +
        '</div>'

    ),
    
    commentToTemplate: _.template(
        '<div>{{ type }} to text <span class="text-link">{{ text_no }}</span> by {{ author.pers_name }}</div>'
    ),
    
    recipientTemplate: _.template(
        '<div>{{ type }}: {{ conf_name }}</div>'
    ),
    
    commentInTemplate: _.template(
        '<div>{{ type }} in text <span class="text-link">{{ text_no }}</span> by {{ author.pers_name }}</div>'
    ),
    
    events: {
        'click .comment-text': 'onCommentText'
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onCommentText');
    },
    
    render: function() {
        var modelJson = this.model.toJSON();
        
        var comment_tos = _.reduce(this.model.get('comment_to_list'), function(memo, ct) {
            return memo + this.commentToTemplate(ct);
        }, "", this);
        
        var recipients = this.model.get('recipient_list').reduce(function(memo, r) {
            return memo + this.recipientTemplate(r.toJSON());
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
    
    onCommentText: function(e) {
        e.preventDefault();
        $(e.target).attr('disabled', 'disabled');
        var newText = new jskom.Models.Text();
        newText.makeCommentTo(this.model);
        this.$el.append(new jskom.Views.CreateText({ model: newText }).render().el);
    }
});
