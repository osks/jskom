_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var JSKom = {
    Models: {},
    Collections: {},
    Views: {},
};

JSKom.Models.Text = Backbone.Model.extend({
    defaults: {
        text_no: 0,
        subject: '',
        body: ''
    }
});

JSKom.Collections.UnreadTexts = Backbone.Collection.extend({
    model: JSKom.Models.Text
});

JSKom.Views.Text = Backbone.View.extend({
    tagName: 'div',

    template: _.template(
        '<div>' +
        '  Text Number: {{ text_no }}' +
        '</div>' +
        '<div>' +
        '  Subject: {{ subject }}' +
        '</div>' +
        '<div>' +
        '  Body: {{ body }}' +
        '</div>'
    ),

    initialize: function(options) {
        _.bindAll(this, 'render');
        this.model.bind('change', this.render);
    },
    
    render: function() {
        $(this.el).html(this.template({
            text_no: this.model.get('text_no'),
            subject: this.model.get('subject'),
            body: _.size(this.model.get('body'))
        }));
        return this;
    },
});

GDS.Views.Entities.Companies = Backbone.View.extend({
    template: _.template(
        '<h2>Companies</h2>' + 
        '<ul></ul>'
    ),
    
    initialize: function(options) {
        _.bindAll(this, 'render', 'addAll', 'addOne');
        this.collection.bind('add', this.addOne);
    },
    
    render: function() {
        $(this.el).html(this.template());
        this.addAll();
        return this;
    },
    
    addAll: function() {
        this.collection.each(this.addOne);
    },
    
    addOne: function(model) {
        var view = new GDS.Views.Entities.Company({model: model});
        view.render();
        $('ul', this.el).append(view.el);
        model.bind('remove', view.remove);
    }
});

GDS.Models.Game = Backbone.Model.extend({
    defaults: {
        year: 0,
        month: 0,
        week: 0,
        day: 0,
    },
    
    initialize: function() {
    },
    
    tick: function() {
        this._advanceCalendar();
    },
    
    _advanceCalendar: function() {
        ++this.day;
        if (this.day % 7 == 0) {
            this.day = 0;
            ++this.week;
        }
        if (this.week % 4 == 0) {
            this.week = 0;
            ++this.month;
        }
        if (this.month % 12 == 0) {
            this.month = 0;
            ++this.year;
        }
    }
});


$(function() {
    var companies = new GDS.Collections.Entities.Companies([
        { name: 'Electronic Arts', money: 123456 },
        { name: 'Valve', money: 23456 },
        { name: 'Blizzard', money: 34567 },
    ]);
    new GDS.Views.Entities.Companies({
        collection: companies, el: $('#companies')
    }).render();
});
