// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";

jskom.Views.App = Backbone.View.extend({
    el: '#jskom',
    
    template: Handlebars.compile(
        '<div class="container">' +
        '  <div id="app-container">' +
        '  </div>' + 
        '  <hr>' +
        '  <footer>' + 
        '      <p>' +
        '        <a href="https://github.com/osks/jskom">jskom</a> ' +
        '        &copy; <a href="mailto:oskar@osd.se">Oskar Skoog</a> 2012</p>' +
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
    template: Handlebars.compile(
        '<div class="alert alert-block alert-{{level}}">' +
        '<a class="close" data-dismiss="alert" href="#">×</a>' +
        '<h4 class="alert-heading">{{ heading }}</h4>' +
        '{{ text }}' +
        '</div>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render');
        if (!options.level) {
            this.level = 'error';
        } else {
            this.level = options.level; // (success, info, warning, error)
        }
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
        $(document).scrollTop(0);
        return this;
    }
});

jskom.Views.Login = Backbone.View.extend({
    id: 'login',
    
    template: Handlebars.compile(
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
                    jskom.Log.debug("session.save - error");
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
    
    template: Handlebars.compile(
        '<div class="row">' +
        '  <div class="span8">' +
        '    <div class="message"></div>' +
        '    <div id="session-container"></div>' +
        '  </div>' +
        '</div>'
    ),
    
    events: {
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'authFailed', 'showUnreadConfs', 'showText', 'newText',
                 'showView');
        this.currentView = null;
        this.model.on('destroy', this.remove, this);
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template());
        
        return this;
    },
    
    showView: function(view) {
        if (this.currentView !== view) {
            if (this.currentView != null) {
                this.currentView.remove();
            }
            this.currentView = view;
            this.$('#session-container').prepend(this.currentView.render().el);
        }
    },
    
    authFailed: function() {
        // the session isn't valid anymore, act like it has been destroyed
        this.model.trigger('destroy');
    },
    
    showUnreadConfs: function() {
        var self = this;
        new jskom.Collections.UnreadConferences().fetch({
            success: function(unreadConfs, resp) {
                jskom.Log.debug("unreadConferences.fetch - success");
                self.showView(new jskom.Views.UnreadConferences({
                    collection: unreadConfs
                }));
            },
            error: function(unreadConfs, resp) {
                jskom.Log.debug("unreadConferences.fetch - error");
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
        var self = this;
        var readMarkings = new jskom.Collections.ReadMarkings([], { conf_no: conf_no });
        readMarkings.fetch({
            data: { unread: true },
            success: function(collection, resp) {
                jskom.Log.debug("readMarkings.fetch(" + conf_no + ") - success");
                self.$('#session-container').empty();
                
                var readQueue = new jskom.Models.ReadQueue({ prefetchCount: 1 });
                readQueue.addUnreadTextNos(readMarkings.pluck('text_no'));
                self.showView(new jskom.Views.Reader({ model: readQueue }));
            },
            error: function(collection, resp) {
                jskom.Log.debug("readMarkings.fetch(" + conf_no + ") - error");
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
        var self = this;
        var text = new jskom.Models.Text({ text_no: text_no });
        text.fetch().done(
            function(data) {
                jskom.Log.debug("text.fetch - success");
                
                self.showView(new jskom.Views.ShowText({ model: text }));
            }
        ).fail(
            function(jqXHR, textStatus) {
                jskom.Log.debug("text.fetch - error");
                
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
        var newText = new jskom.Models.Text();
        newText.on('sync', function() {
            jskom.router.showText(newText.get('text_no'));
            this.$('.message').append(new jskom.Views.Message({
                level: 'success',
                heading: 'Text ' + newText.get('text_no') + ' created.'
            }).el);
        }, this);
        var createTextView = new jskom.Views.CreateText({ model: newText });
        createTextView.on('cancel', function() {
            createTextView.remove();
            jskom.router.home();
        });
        this.showView(createTextView);
    },
    
});

jskom.Views.Reader = Backbone.View.extend({
    template: Handlebars.compile(
        '<h3>{{ unreadCount }} unread texts in this conference</h3>' +
        '<br />' +
        '<div class="message"></div>' +
        '<div id="reader-container"></div>' +
        '' +
        '<div class="reader-controls">' +
        '  <button class="action-back-to-confs btn">' +
        '    Back to conference list' +
        '  </button>' +

        '  <div class="pull-right">' +
        '    {{#if hasUnreadTexts}}' +
        '      <button class="action-next-unread btn btn-primary" disabled="disabled">' +
        '        Next unread text' +
        '      </button>' +
        '    {{/if}}' +
        '</div>'
    ),
    
    events: {
        'click .action-back-to-confs': 'onBackToConfs',
        'click .action-next-unread': 'onReadNext',
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onReadNext', 'showText', 'onKeyDown', 'showView',
                  'remove', 'onBackToConfs');
        this.currentView = null;
        $('body').bind('keydown', this.onKeyDown);
        this.model.on('change', this.render, this);
    },
    
    render: function() {
        this.$el.empty();
        
        this.$el.append(this.template({
            unreadCount: this.model.size(),
            hasUnreadTexts: (this.model.size() > 0 ? true : false)
        }));
        
        var text = this.model.first();
        if (text != null) {
            this.showText(text);
        }
        
        return this;
    },

    showView: function(view) {
        if (this.currentView !== view) {
            if (this.currentView != null) {
                this.currentView.remove();
            }
            this.currentView = view;
            this.$('#reader-container').prepend(this.currentView.render().el);
        }
    },

    remove: function() {
        //jskom.Log.debug("unbind");
        $('body').unbind('keydown', this.onKeyDown); // unbind
        this.$el.remove();
        return this;
    },
    
    isScrolledIntoView: function(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();
        
        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();
        
        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    },
    
    onBackToConfs: function(e) {
        e.preventDefault();
        jskom.router.home();
    },
    
    onKeyDown: function(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
            return true;
        }
        
        // Check that we're not in an input field or similarly
        if (e.target.nodeName.toLowerCase() != 'body') {
            return true;
        }
        
        var ret = true;
        switch (e.which) {
        case 32: // Space
            if (this.model.size() > 0) {
                if (this.isScrolledIntoView(this.$('.action-next-unread'))) {
                    e.preventDefault();
                    this.$('.action-next-unread').click();
                    ret = false;
                }
            } else {
                jskom.router.home();
                ret = false;
            }
        }
        
        return ret;
    },
    
    showText: function(text) {
        var self = this;
        text.deferredFetch().done(
            function(data) {
                var textView = new jskom.Views.ShowText({
                    model: text,
                    markAsReadOnRender: true
                });
                
                // Handle when someone clicks on a text link
                textView.on('text:show', function(text_no) {
                    var textToShow = new jskom.Models.Text({ text_no: text_no });
                    self.showText(textToShow);
                });
                
                self.showView(textView);
                self.$('.action-next-unread').removeAttr('disabled');
                $(document).scrollTop(0);
            }
        ).fail(
            function(jqXHR, textStatus) {
                if (jqXHR.status == 401) {
                    jskom.router.login();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Failed to load text!',
                        text: jqXHR.responseText
                    }).el);
                }
            }
        );
    },
    
    onReadNext: function(e) {
        e.preventDefault();
        this.$('.action-next-unread').attr('disabled', 'disabled');
        this.model.moveNext();
    },
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
        this.trigger('text:show', this.text_no);
    }
});

jskom.Views.Menu = Backbone.View.extend({
    tagName: 'div',
    id: 'menu',
    
    template: Handlebars.compile(
        '<div class="navbar navbar-fixed-top">' +
        '  <div class="navbar-inner">' +
        '    <div class="container" id="menu-container">' +
        '      <a class="brand" href="{{ home_url }}">jskom</a>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    ),
    
    loggedInMenuTemplate: Handlebars.compile(
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
        '    <i class="icon-user"></i> <span class="hidden-phone">{{ model.pers_name }}</span>' +
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
    className: 'unread-conferences',
    
    template: Handlebars.compile(
        '<h2 class="headline">Unread conferences</h2>' + 
        '<div class="message"></div>' +
        '<ul></ul>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne', 'onKeyDown', 'remove');
        // This is so we can modify the list without having to redraw the entire list
        this.collection.on('add', this.addOne);
        $('body').bind('keydown', this.onKeyDown);
    },
    
    render: function() {
        this.$el.empty().append(this.template());
        this.addAll();
        return this;
    },
    
    onKeyDown: function(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
            return true;
        }
        
        // Check that we're not in an input field or similarly
        if (e.target.nodeName.toLowerCase() != 'body') {
            return true;
        }
        
        var ret = true;
        switch (e.which) {
        case 32: // Space
            if (this.collection.size() > 0) {
                jskom.router.showUnreadTextsInConf(this.collection.first().get('conf_no'));
                ret = false;
            }
        }
        
        return ret;
    },
    
    remove: function() {
        jskom.Log.debug("unbind");
        $('body').unbind('keydown', this.onKeyDown); // unbind
        this.$el.remove();
        return this;
    },
    
    addAll: function() {
        if (this.collection.isEmpty()) {
            this.$('ul').append("<li>Nothing unread.</li>");
        } else {
            this.collection.each(this.addOne);
        }
    },
    
    addOne: function(model) {
        var view = new jskom.Views.UnreadConference({ model: model });
        view.render();
        this.$('ul').append(view.el);
        model.on('remove', view.remove);
    }
});

jskom.Views.UnreadConference = Backbone.View.extend({
    tagName: 'li',
    
    template: Handlebars.compile(
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
    
    template: Handlebars.compile(
        '<label>Recipients</label>' +
        '<div class="recipients"></div>' +
        '<p/>' +
        '<button class="btn btn-small btn-success add-recipient">' +
        '  <i class="icon-plus-sign icon-white"></i> Recipient' +
        '</button>' +
        '<p/>'
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
    
    template: Handlebars.compile(
        '  <div class="span8">' +
        '      <select class="input-small" name="recipient_list.{{index}}.type">' +
        '        <option value="to" {{ to_selected }}>To</option>' +
        '        <option value="cc" {{ cc_selected }}>CC</option>' +
        '        <option value="bcc" {{ bcc_selected }}>BCC</option>' +
        '      </select>' +
        '      <input class="span5" type="text" name="recipient_list.{{index}}.conf_name" ' +
        '             value="{{ model.conf_name }}" />' +
        '      <button class="btn btn-small btn-danger remove-recipient">' +
        '        <i class="icon-minus-sign icon-white"></i>' +
        '      </button>' +
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
    template: Handlebars.compile(
        '{{#if isComment}}' +
        '  <h3>New comment</h3>' +
        '{{else}}' +
        '  <h3>New text</h3>' +
        '{{/if}}' +
        '<div class="message"></div>' +
        '<form>' +
         
        '  <label>Subject</label>' + 
        '  <input class="span8" type="text" name="subject" value="{{ model.subject }}" />' +
         
        '  <label>Body</label>' +
        '  <textarea class="span8" name="body" rows="5" ' +
        '            {{#if isComment}}autofocus{{/if}}></textarea>' +
        
        '  <div class="form-actions">' + 
        '    <button class="btn action-cancel">Cancel</button>' +

        '    <div class="read-marking pull-right">' +
        '      <input type="submit" class="btn btn-primary" value="Post" />' +
        '    </div>' +
        '  </div>' + 
        '</form>'
    ),
    
    events: {
        'submit form': 'onSubmit',
        'click .action-cancel': 'onCancel',
    },
    
    initialize: function() {
        _.bindAll(this, 'render', 'onSubmit', 'onCancel');
    },
    
    render: function() {
        this.$el.empty();
        
        this.$el.append(this.template({
            model: this.model.toJSON(),
            isComment: (this.model.get('comment_to_list') ? true : false)
        }));
        
        this.$('form').prepend(new jskom.Views.RecipientList({
            collection: this.model.get('recipient_list')
        }).render().el);
        
        return this;
    },
    
    onCancel: function(e) {
        e.preventDefault();
        this.trigger('cancel', this);
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
                jskom.Log.debug("text.save - success");
                self.remove();
            }
        ).fail(
            function(jqXHR, textStatus) {
                jskom.Log.debug("text.save - error");
                // TODO: real error handling
                if (jqXHR.status == 401) {
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Unauthorized!',
                        text: "Your session has probably ended."
                    }).el);
                } else {
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Error!',
                        text: jqXHR.responseText
                    }).el);
                }
            }
        );
    },
});

jskom.Views.ShowText = Backbone.View.extend({
    className: 'text',
    
    template: Handlebars.compile(
        '<div class="message"></div>' +
        '<h4>' +
        '  <span class="text-link">{{ model.text_no }}</span>' +
        '  / {{ model.creation_time }} / {{ model.author.pers_name }}' +
        '</h4>' +
        
        '<div class="text">' + 
        
        '  {{#each model.comment_to_list}} ' +
        '    <div>' +
        '      {{ this.type }} to text <span class="text-link">{{ this.text_no }}</span>' +
        '       by {{ this.author.pers_name }}' +
        '    </div>' +
        '  {{/each}}' +

        '  {{#each model.recipient_list}}' +
        '    <div>{{ this.type }}: {{ this.conf_name }}</div>' +
        '  {{/each}}' +
        
        '  <div>subject: {{ model.subject }}</div>' +
        '  <hr/>' +
        '  <div>{{ body }}</div>' +
        '  <hr/>' +

        '  {{#each model.comment_in_list}}' +
        '    <div>' +
        '      {{ this.type }} in text <span class="text-link">{{ this.text_no }}</span>' +
        '      by {{ this.author.pers_name }}' +
        '    </div>' +
        '  {{/each}}' +

        '</div>' +
        
        '<div class="text-controls form-actions">' +
        '  <button class="write-comment btn">Write comment</button>' +

        '  <div class="read-marking pull-right">' +
        '    <button class="mark-as-read btn btn-mini btn-inverse" autocomplete="off"' +
        '            data-loading-text="Marking as read..."' +
        '            data-complete-text="Marked as read">' +
        '       Mark as read' +
        '    </button>' +
        '  </div>' +
        '</div>'
    ),
    
    events: {
        'click .write-comment': 'onWriteComment',
        'click .mark-as-read': 'onMarkAsRead',
    },
    
    initialize: function(options) {
        options || (options = {})
        _.bindAll(this, 'render', 'onWriteComment', 'onMarkAsRead', 'onKeyDown', 'remove');
        $('body').bind('keydown', this.onKeyDown);
        
        if (options.markAsReadOnRender) {
            this.markAsReadOnRender = true;
        } else {
            this.markAsReadOnRender = false;
        }
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.template({
            model: this.model.toJSON(),
            body: this.model.getSafeBody(),
        }));
        
        var self = this;
        this.$(".text-link").each(function() {
            var text_no =  $(this).text();
            var textLink = new jskom.Views.TextLink({ text_no: text_no });
            textLink.on('text:show', function(text_no) {
                self.trigger('text:show', text_no);
            });
            $(this).empty().append(textLink.render().el);
        });
        
        if (this.markAsReadOnRender) {
            // Trigger mark as read
            this.$('.mark-as-read').click();
        }
        
        return this;
    },
    
    onKeyDown: function(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
            return true;
        }
        
        // Check that we're not in an input field or similarly
        if (e.target.nodeName.toLowerCase() != 'body') {
            return true;
        }
        
        var ret = true;
        switch (e.which) {
        case 75: // k (lower case)
            if (this._previousKeyDown && this._previousKeyDown.which == 219) {
                // å k
                var commentTos = this.model.get('comment_to_list');
                if (commentTos && commentTos.length > 0) {
                    this.trigger('text:show', commentTos[0].text_no);
                }
            } else {
                this.$('.write-comment').click();
                ret = false;
            }
        }
        
        
        this._previousKeyDown = e;
        return ret;
    },
    
    onWriteComment: function(event) {
        event.preventDefault();
        $(event.target).attr('disabled', 'disabled');
        
        var newText = new jskom.Models.Text();
        newText.makeCommentTo(this.model);
        newText.on('sync', function() {
            this.$('.message').append(new jskom.Views.Message({
                level: 'success',
                heading: 'Text ' + newText.get('text_no') + ' created.'
            }).el);
            $(event.target).removeAttr('disabled');
        }, this);
        
        var createTextView = new jskom.Views.CreateText({ model: newText });
        createTextView.on('cancel', function() {
            createTextView.remove();
            $(event.target).removeAttr('disabled');
        });
        this.$el.append(createTextView.render().el);
    },
    
    onMarkAsRead: function(e) {
        e.preventDefault();
        
        this.$('.mark-as-read').button('loading');
        
        var self = this;
        this.model.markAsReadGlobal().done(
            function(data) {
                jskom.Log.debug("markAsReadGlobal - success");
                self.$('.mark-as-read')
                    .button('complete')
                    .removeClass('btn-inverse')
                    .addClass('btn-success');
            }
        ).fail(
            function(jqXHR, textStatus) {
                jskom.Log.debug("markAsReadGlobal - error");
                
                self.$('.mark-as-read')
                    .button('reset')
                    .removeAttr('disabled');
                
                if (jqXHR.status == 401) {
                    jskom.router.login();
                } else {
                    // TODO: error handling
                    self.$('.message').append(new jskom.Views.Message({
                        heading: 'Failed to mark text as read!',
                        text: jqXHR.responseText
                    }).el);
                }
            }
        );
    },
    
    remove: function() {
        //jskom.Log.debug("unbind");
        $('body').unbind('keydown', this.onKeyDown); // unbind
        this.$el.remove();
        return this;
    },
});
