// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";

(function($, _, Backbone, Handlebars, Models, Collections, Log, Settings) {

    Models.Session = Backbone.Model.extend({
        url: function() {
            var base = '/sessions/';
            if (this.isNew()) return base;
            return base + encodeURIComponent(this.id);;
        },
        
        defaults: {
            pers_name: null,
            password: null, // TODO: Somehow not store password in model
            pers_no: null,
            client: {
                name: "jskom",
                version: jskom.version
            }
        },
        
        validate: function(attrs) {
            if (!attrs.pers_name) {
                // ugly hack to make them look the same as jqXHR...
                return { responseText: "can't have an empty person name" };
            }
        },
    },
                                           {
                                               // Class methods here
                                               
                                               _getSessionIdFromCookie: function() {
                                                   var session_id = $.cookie('session_id')
                                                   Log.debug("getSessionIdFromCookie: " + session_id)
                                                   return session_id;
                                               },
                                               
                                               fetchCurrentSession: function(callback) {
                                                   var currentSessionId = Models.Session._getSessionIdFromCookie();
                                                   if (!currentSessionId || currentSessionId == '') {
                                                       Log.debug("currentSessionId: " + currentSessionId);
                                                       callback(new Models.Session());
                                                   } else {
                                                       var currentSession = new Models.Session({
                                                           id: currentSessionId
                                                       });
                                                       currentSession.fetch({
                                                           success: function(session, resp) {
                                                               Log.debug("currentSession.fetch - success");
                                                               callback(session);
                                                           },
                                                           error: function(session, resp) {
                                                               Log.debug("currentSession.fetch - error");
                                                               callback(new Models.Session());
                                                           }
                                                       });
                                                   }
                                               }
                                           });

    Models.Recipient = Backbone.Model.extend({
        defaults: {
            type: null,
            conf_name: null,
            conf_no: null
        }
    });

    Collections.RecipientList = Backbone.Collection.extend({
        model: Models.Recipient
    });

    Models.Text = Backbone.Model.extend({
        idAttribute: 'text_no',
        
        url: function() {
            var base = '/texts/';
            if (this.isNew()) return base;
            return base + this.get('text_no');
        },
        
        defaults: {
            text_no: null,
            creation_time: null,
            author: null,
            comment_to_list: null,
            comment_in_list: null,
            content_type: null,
            subject: '',
            body: ''
        },
        
        initialize: function(options) {
            this._fetchDeferred = null; // created when deferredFetch is called the first time.
            this.set({ recipient_list: new Collections.RecipientList() });
        },
        
        getSafeBody: function() {
            var mime_type = Mimeparse.parseMimeType(this.get('content_type'));
            var type = mime_type[0];
            
            if (type == 'text') {
                var safeBody = Handlebars.Utils.escapeExpression(this.get('body'));
                safeBody = safeBody.replace(/\r?\n|\r/g, "<br>");
                return new Handlebars.SafeString(safeBody);
            } else if (type == 'image') {
                var name = "";
                if (mime_type[2]['name']) {
                    name = mime_type[2]['name'];
                }
                
                var imageUrl = Settings.HttpkomServer + this.url() + '/body';
                var imageBody = '<img src="' + imageUrl + '" title="'+ name +'" />';
                return new Handlebars.SafeString(imageBody);
            } else {
                return "<unknown content-type: " + this.get('content_type') + ">";
            }
        },
        
        toJSON: function() {
            var json = _.clone(this.attributes);
            if (this.get('recipient_list')) {
                json.recipient_list = this.get('recipient_list').map(function(recipient) {
                    return recipient.toJSON();
                });
            } else {
                json.recipient_list = null;
            }
            return json;
        },
        
        parse: function(resp, xhr) {
            var recipientListJson = resp.recipient_list;
            var recipients = _.map(recipientListJson, function(recipientJson) {
                var r = new Models.Recipient();
                r.set(r.parse(recipientJson), { silent: true });
                return r;
            });
            // overwrite the json with the parsed collection
            resp.recipient_list = new Collections.RecipientList(recipients);
            return resp;
        },

        deferredFetch: function() {
            if (!this._fetchDeferred) {
                var self = this;
                this._fetchDeferred = this.fetch().done(
                    function(data) {
                        Log.debug("text.deferredFetch(" + self.get('text_no') + ") - success");
                    }
                ).fail(
                    function(jqXHR, textStatus) {
                        Log.debug("text.deferredFetch(" + self.get('text_no') + ") - error");
                    }
                );
            }
            return this._fetchDeferred;
        },
        
        markAsReadGlobal: function() {
            return new Models.GlobalReadMarking({ text_no: this.get('text_no') }).save();
        },
        
        markAsUnreadGlobal: function() {
            return new Models.GlobalReadMarking({ text_no: this.get('text_no') }).destroy();
        },
        
        makeCommentTo: function(otherText) {
            otherText.get('recipient_list').each(function(r) {
                // Only copy "to" recipients, not "cc" or "bcc".
                if (r.get('type') == 'to') {
                    this.get('recipient_list').add(r.clone());
                }
            }, this);
            this.set({
                comment_to_list: [
                    { type: 'comment', text_no: otherText.get('text_no') }
                ],
                subject: otherText.get('subject')
            });
        }
    });

    Collections.SortedTextList = Backbone.Collection.extend({
        model: Models.Text,
        
        // Sorted by text number
        comparator: function(text) {
            return text.get('text_no');
        }
    });

    // ReadQueue is not a collection, because you cannot use it as a collection.
    Models.ReadQueue = Backbone.Model.extend({
        initialize: function(options) {
            options || (options = {})
            
            this._prefetchCount = (options.prefetchCount || Settings.PrefetchCount);
            this._currentText = null;
            this._currentThreadStack = [];
            
            this._unreadTexts = new Collections.SortedTextList();
            
            if (options.unreadTextNos) {
                this.addUnreadTextNos(options.unreadTextNos);
            }
        },
        
        addUnreadTextNos: function(unreadTextNos) {
            var unreadTexts = _.map(unreadTextNos, function(text_no) {
                return new Models.Text({ text_no: text_no });
            });
            this._unreadTexts.add(unreadTexts);
            
            if (this._currentText == null && this.size() > 0) {
                this.moveNext();
            }
            this.trigger('add', this);
        },
        
        first: function() {
            return this._currentText;
        },
        
        moveNext: function() {
            // Algorithm:
            // 
            // We use a stack to store the parts of the thread we don't
            // visit this time. Because we are not traversing the entire
            // tree at this time, we need to remember texts (branches)
            // further up in the tree, so we know where to continue when
            // the current branch ends.
            // 
            // If there are texts on the stack: pop to get the new text.
            // 
            // Else: find new thread start by selecting the unread text
            // with lowest text number.
            // 
            // For the new text, push all unread comments onto the stack, in
            // reverse order.
            
            var nextText = null;
            if (this._currentThreadStack.length > 0) {
                // We still have texts to read in this thread
                nextText = this._currentThreadStack.pop();
                this._unreadTexts.remove(nextText);
                Log.debug("readQueue:moveNext() - pop:ed " +
                          nextText.get('text_no') + " from stack.")
            } else {
                // No more texts in this thread, find new thread
                
                if (this._unreadTexts.size() > 0) {
                    // We have unread texts, find new thread start by taking the
                    // lowest text number.
                    // Since this._unreadTexts is sorted, we just shift.
                    nextText = this._unreadTexts.shift();
                    Log.debug("readQueue:moveNext() - found new thread in " +
                              nextText.get('text_no'));
                } else {
                    // No unread texts
                    nextText = null;
                    Log.debug("readQueue:moveNext() - no unread texts.")
                }
            }
            
            if (nextText == null) {
                // Nothing to read, set currentText to null
                this._currentText = null;
                this.trigger('change', this);
            } else {
                // Start fetching the new current text, and when we have
                // fetched the text: Push all comments onto the stack, in
                // reverse order
                var self = this;
                nextText.deferredFetch().done(function() {
                    // Don't trigger the change event until we've fetched the text
                    // That way we know that we won't call moveNext() again until
                    // the new text has been fetched.
                    self._currentText = nextText;
                    self.trigger('change', self);
                    
                    var comments = _.clone(nextText.get('comment_in_list'));
                    if (comments) {
                        var commentTextNos = _.pluck(comments, 'text_no');
                        commentTextNos.reverse();
                        _.each(commentTextNos, function(commentTextNo) {
                            self._currentThreadStack.push(new Models.Text({
                                text_no: commentTextNo
                            }));
                        });
                    }
                    
                    // Simple prefetch of texts on the thread stack, we
                    // wait for the fetch so we can consider the new
                    // text's comments. ("last" because we pop from the end of the array)
                    _.each(_.last(self._currentThreadStack, self._prefetchCount), function(text) {
                        Log.debug("readQueue:moveNext() - prefetching comment "
                                  + text.get('text_no'));
                        text.deferredFetch();
                    });
                });
                
                // Simple prefetch of the texts with low text numbers
                // ("thread starts"), no need to wait for fetching of the
                // new text.
                _.each(this._unreadTexts.first(this._prefetchCount), function(text) {
                    Log.debug("readQueue:moveNext() - prefetching " + text.get('text_no'));
                    text.deferredFetch();
                });
            }
        },
        
        isEmpty: function() {
            return !(this.size > 0);
        },
        
        size: function() {
            // should we include currentText or not? currently not. it's assumed to be
            // read.
            return this._unreadTexts.length;
        }
    });

    Models.UnreadConference = Backbone.Model.extend({
        idAttribute: 'conf_no',
        
        defaults: {
            conf_no: null,
            name: null,
            no_of_unread: null
        }
    });

    Collections.UnreadConferences = Backbone.Collection.extend({
        model: Models.UnreadConference,
        
        url: '/conferences/unread/',
        
        // Because httpkom doesn't return an array of models by default we need
        // to point Backbone.js at the correct property
        parse: function(resp, xhr) {
            return resp.confs;
        },
    });


    Models.LocalReadMarking = Backbone.Model.extend({
        idAttribute: 'text_no',
        
        defaults: {
            conf_no: null,
            local_text_no: null,
            text_no: null,
            unread: null,
        },
        
        url: function() {
            return '/conferences/' + encodeURIComponent(this.get('conf_no')) +
                '/texts/' + encodeURIComponent(this.get('local_text_no')) + '/read-marking';
        },
    });

    Models.GlobalReadMarking = Backbone.Model.extend({
        idAttribute: 'text_no',
        
        defaults: {
            text_no: null,
            unread: null,
        },
        
        url: function() {
            return '/texts/' +
                encodeURIComponent(this.get('text_no')) + '/read-marking';
        },
    });

    Collections.ReadMarkings = Backbone.Collection.extend({
        model: Models.LocalReadMarking,
        
        url: function() {
            return '/conferences/' +
                encodeURIComponent(this.conf_no) + '/read-markings/';
        },
        
        initialize: function(models, options) {
            this.conf_no = options.conf_no;
        },

        // Because httpkom doesn't return an array of models by default we need
        // to point Backbone.js at the correct property
        parse: function(resp, xhr) {
            return resp.rms;
        },
    });

})(jQuery, _, Backbone, Handlebars, jskom.Models, jskom.Collections, jskom.Log, jskom.Settings);
