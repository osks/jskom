// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";

var jskom = {
    version: "0.1",
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
        HttpkomServer: "",
        PrefetchCount: 2
    },
    
    Models: {},
    Collections: {},
    Views: {},
    
    Log: {
        debug: function() {
            if (window.console && console.log) {
                console.log.apply(console, arguments);
            }
        }
    },
    
    init: function() {
        $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
            options.url = jskom.Settings.HttpkomServer + options.url;
            
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
    },
    
    checkBrowser: function() {
        var supported = true;
        var ul = $("<ul></ul>");
        if (!$.support.ajax) {
            supported = false;
            $(ul).append("<li>Ajax</li>");
        }
        if (!$.support.cors) {
            supported = false;
            $(ul).append("<li>CORS</li>");
        }
        
        if (!supported) {
            $('body').empty().append("<div></div>");
            $('body div')
                .append('<h3>Your browser is too old for jskom</h3>')
                .append('Missing support for:')
                .append(ul);
            return false;
        } else {
            return true;
        }
    }
};

$(function() {
    if (jskom.checkBrowser()) {
        jskom.init();
    }
});
