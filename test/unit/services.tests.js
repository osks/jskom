'use strict';

mocha.setup('tdd')
var assert = chai.assert;

suite('htmlFormattingService', function() {
  beforeEach(module('jskom.services'));
  
  var service;
  beforeEach(inject(function(htmlFormattingService) {
    service = htmlFormattingService;
  }));
  
  suite('#formatBody()', function() {
    test('should linkify url', function() {
      var url = 'http://jskom.osd.se/?baz=foo%20bar(barbapappa)';
      
      assert.equal(service.formatBody(url),
                   '<a target="_blank" href="' + url + '">' + url + '</a>');
    });
    
    test('should linkify text number', function() {
      assert.equal(service.formatBody('123'), '123');
      
      assert.equal(service.formatBody('1234'),
                   '<jskom:a text-no="1234">1234</jskom:a>');

      assert.equal(service.formatBody('a text number 1287624 in some text'),
                   'a text number <jskom:a text-no="1287624">1287624</jskom:a> in some text');
    });
    
    test('should linkify lyskom text link', function() {
      assert.equal(service.formatBody('<text  1234567>'),
                   '<jskom:a text-no="1234567">&lt;text  1234567&gt;</jskom:a>');
    });
    
    test('should replace newlines with br tags', function() {
      assert.equal(service.formatBody('\n'), '<br/>');
      assert.equal(service.formatBody('\n\n'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n'), '<br/>');
      assert.equal(service.formatBody('\n\r'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n\n'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n\r\n'), '<br/><br/>');
    });
    
    test('should handle urls that are part of other urls', function() {
      var text = 'http://google.com\n and another url http://google.com/foo/bar';
      
      assert.equal(service.formatBody(text),
                   '<a target="_blank" href="http://google.com">http://google.com</a>' +
                   '<br/> and another url <a target="_blank" href="http://google.com/foo/bar">' +
                   'http://google.com/foo/bar</a>');
    })
  });
});
