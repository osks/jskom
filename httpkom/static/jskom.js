_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var jskom = {
    Models: {},
    Collections: {},
    Views: {},
    
    init: function() {
        //jskom.vent = _.extend({}, Backbone.Events); // event aggregator
        
        // debug
        //jskom.vent.on('all', function(eventName) {
        //    console.log("vent: " + eventName);
        //});
        
        jskom.Models.Session.fetchCurrentSession(function(currentSession) {
            jskom.router = new jskom.Router({
                currentSession: currentSession
            });
            Backbone.history.start({ pushState: true, root: '/jskom/' });
        });
    }
};

$(function() {
    jskom.init();
});
