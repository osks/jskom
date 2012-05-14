
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
            callback(null);
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
                    callback(null);
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
