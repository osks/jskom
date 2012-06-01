// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";

var jskom = {
    version: "0.1",
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    httpkom: "",
    
    Models: {},
    Collections: {},
    Views: {},
    
    // TODO: Look at http://benalman.com/projects/javascript-debug-console-log/
    Log: {
        debug: function() {
            if (window.console && console.log) {
                console.log.apply(console, arguments);
            }
        }
    },
    
    init: function() {
        $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
            options.url = jskom.httpkom + options.url;

            options.xhrFields = {
                withCredentials: true
            };
        });
        
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
