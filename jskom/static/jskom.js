_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    version: "0.1",
    server: "http://localhost:5001",
    
    Models: {},
    Collections: {},
    Views: {},
    
    init: function() {
        //jskom.vent = _.extend({}, Backbone.Events); // event aggregator
        
        // debug
        //jskom.vent.on('all', function(eventName) {
        //    console.log("vent: " + eventName);
        //});
        
        var jskomUrlRoot = '/';
        jskom.Models.Session.fetchCurrentSession(function(currentSession) {
            jskom.router = new jskom.Router({
                currentSession: currentSession,
                urlRoot: jskomUrlRoot
            });
            Backbone.history.start({ pushState: true, root: jskomUrlRoot });
        });
    }
};

$(function() {
    jskom.init();
});
