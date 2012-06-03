// Copyright (C) 2012 Oskar Skoog. Released under GPL.

"use strict";


(function($, _, Backbone, Handlebars) {

var jskom;    
jskom = window.jskom = {
    version: "0.1",
    
    Routers: {},
    Models: {},
    Collections: {},
    Views: {},
    
    // httpkom server URL without trailing slash (example: 'http://localhost:5001')
    Settings: {
        HttpkomServer: "",
        PrefetchCount: 2
    },
    
    Log: {
        debug: function() {
            if (window.console && console.log) {
                console.log.apply(console, arguments);
            }
        }
    },
    
    init: function() {
        var jskomUrlRoot = '/';
        jskom.Models.Session.fetchCurrentSession(function(currentSession) {
            jskom.router = new jskom.Routers.AppRouter({
                currentSession: currentSession,
                urlRoot: jskomUrlRoot
            });
            Backbone.history.start({ pushState: true, root: jskomUrlRoot });
        });
    },
};
    
var checkBrowser = function() {
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
};

$(function() {
    if (checkBrowser()) {
        jskom.init();
    }
});


$.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
    options.url = jskom.Settings.HttpkomServer + options.url;
    
    options.xhrFields = {
        withCredentials: true
    };
});


Handlebars.registerHelper('url_for', function() {
    // Example: {{url_for "texts/" text_no}} or {{url_for "texts" "/" "more" "/" text_no}}
    
    // Remove the last argument, because it's the options object.
    var params = _.first(arguments, arguments.length-1)
    var path = _.reduce(params, function(memo, str){ return memo + str; }, "");
    //jskom.Log.debug("url_for: " + path);
    return jskom.router.url(path);
});

Handlebars.registerHelper('text_link', function(text_no, options) {
    // Example: {{text_link text_no}} or {{text_link text_no text="hej"}}
    
    var url = jskom.router.url('texts/' + text_no);
    var text = (options.hash['text'] || text_no);
    
    return new Handlebars.SafeString(
        '<a class="text-link" href="' + Handlebars.Utils.escapeExpression(url) +
            '" data-text-no="' + Handlebars.Utils.escapeExpression(text_no) + '">' + 
            Handlebars.Utils.escapeExpression(text) + '</a>');
});

})(jQuery, _, Backbone, Handlebars);
