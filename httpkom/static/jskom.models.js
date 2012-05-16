
jskom.Models.Session = Backbone.Model.extend({
    url: function() {
        var base = '/sessions/';
        if (this.isNew()) return base;
        return base + encodeURIComponent(this.id);;
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
    },
},
{
    // Class methods here
    
    _getSessionIdFromCookie: function() {
        var session_id = $.cookie('session_id')
        console.log("getSessionIdFromCookie: " + session_id)
        return session_id;
    },
    
    fetchCurrentSession: function(callback) {
        var currentSessionId = jskom.Models.Session._getSessionIdFromCookie();
        if (!currentSessionId || currentSessionId == '') {
            console.log("currentSessionId: " + currentSessionId);
            callback(new jskom.Models.Session());
        } else {
            var currentSession = new jskom.Models.Session({
                id: currentSessionId
            });
            currentSession.fetch({
                success: function(session, resp) {
                    console.log("currentSession.fetch - success");
                    callback(session);
                },
                error: function(session, resp) {
                    console.log("currentSession.fetch - error");
                    callback(new jskom.Models.Session());
                }
            });
        }
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
        creation_time: null,
        author: null,
        recipient_list: null,
        comment_to_list: null,
        comment_in_list: null,
        content_type: null,
        subject: '',
        body: ''
    },
    
    makeCommentTo: function(otherText) {
        this.set({
            recipient_list: _.filter(_.clone(otherText.get('recipient_list')), function(r) {
                // Only copy "to" recipients, and not "cc" or "bcc".
                return r.type == 'to';
            }),
            comment_to_list: [
                {
                    type: 'comment',
                    text_no: otherText.get('text_no')
                }
            ],
            subject: otherText.get('subject')
        });
    }
});

jskom.Models.ReadQueueItem = Backbone.Model.extend({
    idAttribute: 'text_no',
    
    initialize: function(options) {
        this.globalReadMarking = new jskom.Models.GlobalReadMarking({
            text_no: this.get('text_no')
        });
        this.text = null; // for pre-fetching
    },
    
    fetchText: function(options) {
        // TODO: If we have already started fetching a text and then calls this
        // method again, we should be able to attach the success/error callback to
        // the ongoing fetch, instead of starting a new fetch.
        
        options || (options = {})
        var self = this;
        var text = new jskom.Models.Text({ text_no: this.get('text_no') }).fetch({
            success: function(t, resp) {
                console.log("ReadQueueItem.fetchText(" + t.get('text_no') + ") - success");
                self.text = t;
                if (options.success) options.success(t, resp);
            },
            error: function(t, resp) {
                console.log("ReadQueueItem.fetchText(" + t.get('text_no') + ") - error");
                self.text = null;
                // TODO: error handling
                // what can we really do here?
                if (options.error) options.error(t, resp);
            }
        });
    }
}),

jskom.Collections.ReadQueue = Backbone.Collection.extend({
    model: jskom.Models.ReadQueueItem,
    
    shiftAndPrefetchNextText: function() {
        var cur = this.shift();
        if (!this.isEmpty()) {
            this.at(0).fetchText();
        }
        return cur;
    }
});

jskom.Models.UnreadConference = Backbone.Model.extend({
    idAttribute: 'conf_no',
    
    defaults: {
        conf_no: null,
        name: null,
        no_of_unread: null
    }
});

jskom.Collections.UnreadConferences = Backbone.Collection.extend({
    model: jskom.Models.UnreadConference,
    
    url: '/conferences/unread/',
    
    // Because httpkom doesn't return an array of models by default we need
    // to point Backbone.js at the correct property
    parse: function(resp, xhr) {
        return resp.confs;
    },
});


jskom.Models.LocalReadMarking = Backbone.Model.extend({
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

jskom.Models.GlobalReadMarking = Backbone.Model.extend({
    idAttribute: 'text_no',
    
    defaults: {
        text_no: null,
        unread: null,
    },
    
    url: function() {
        return '/texts/' + encodeURIComponent(this.get('text_no')) + '/read-marking';
    },
});

jskom.Collections.ReadMarkings = Backbone.Collection.extend({
    model: jskom.Models.LocalReadMarking,
    
    url: function() {
        return '/conferences/' + encodeURIComponent(this.conf_no) + '/read-markings/';
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
