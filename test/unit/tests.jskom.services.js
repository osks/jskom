'use strict';

suite('htmlFormattingService', function() {
  setup(module('jskom.services'));
  
  var service;
  setup(inject(function(htmlFormattingService) {
    service = htmlFormattingService;
  }));
  
  suite('#formatBody()', function() {
    test('should linkify url', function() {
      var url = 'http://jskom.osd.se/some/thing?baz=foo%20bar(barbapappa)';
      
      assert.equal(service.formatBody(url),
                   '<a target="_blank" href="' + url + '">' + url + '</a>');
    });
    
    test('should not include surrounding brackets or parentheses', function() {
      var url = 'http://jskom.osd.se/?baz=foo%20bar(barbapappa)';
      
      assert.equal(service.formatBody('[' + url + ']'),
                   '[<a target="_blank" href="' + url + '">' + url + '</a>]');
      
      assert.equal(service.formatBody('(' + url + ')'),
                   '(<a target="_blank" href="' + url + '">' + url + '</a>)');
      
      assert.equal(service.formatBody('<' + url + '>'),
                   '&lt;<a target="_blank" href="' + url + '">' + url + '</a>&gt;');
    });
    
    test('should not include url: prefix in brackets', function() {
      var url = 'http://jskom.osd.se/?baz=foo%20bar(barbapappa)';
      
      assert.equal(service.formatBody('<url:' + url + '>'),
                   '<a target="_blank" href="' + url + '">&lt;url:' + url + '&gt;</a>');

      assert.equal(service.formatBody('<url: ' + url + ' >'),
                   '<a target="_blank" href="' + url + '">&lt;url: ' + url + ' &gt;</a>');
      
      assert.equal(service.formatBody('<URL:' + url + '>'),
                   '<a target="_blank" href="' + url + '">&lt;URL:' + url + '&gt;</a>');
    });
    
    test('should linkify text number', function() {
      assert.equal(service.formatBody('123'), '123');
      
      assert.equal(service.formatBody('1234'),
                   '<a href="/texts/?text=1234">1234</a>');
      
      assert.equal(service.formatBody('a text number 1287624 in some text'),
                   'a text number <a href="/texts/?text=1287624">1287624</a> in some text');
    });
    
    test('should linkify lyskom conf link', function() {
      assert.equal(service.formatBody('<möte12345>'), '&lt;möte12345&gt;');
      
      assert.equal(service.formatBody('<möte 67890>'),
                   '<a href="/conferences/67890">&lt;möte 67890&gt;</a>');
      
      assert.equal(service.formatBody('<möte 6: Inlägg }t mig>'),
                   '<a href="/conferences/6">&lt;möte 6: Inlägg }t mig&gt;</a>');

      assert.equal(service.formatBody('<person  14506>'),
                   '<a href="/conferences/14506">&lt;person  14506&gt;</a>');
      
      assert.equal(service.formatBody('<person 14506: Oskars Testperson>'),
                   '<a href="/conferences/14506">&lt;person 14506: Oskars Testperson&gt;</a>');
    });
    
    test('should linkify lyskom text link', function() {
      assert.equal(service.formatBody('<text12345>'), '&lt;text12345&gt;');
      
      assert.equal(service.formatBody('<text  1234567>'),
                   '<a href="/texts/?text=1234567">&lt;text  1234567&gt;</a>');
      
      assert.equal(service.formatBody('<text 4711: lite text>'),
                   '<a href="/texts/?text=4711">&lt;text 4711: lite text&gt;</a>');
      
      // This test shows that a line feed character inside a lyskom
      // <text ..> tag will remain a line feed, and not be replaced by
      // a <br> tag. This is because we don't handle nested tags.
      assert.equal(service.formatBody('Man trycker C-c C-i C-l (tänk på det som "insert link" eller "infoga\nlänk") och svarar på frågorna. Eller så skriver man <text 4711: en\ntegelsten>.'),
                   'Man trycker C-c C-i C-l (tänk på det som &quot;insert link&quot; eller &quot;infoga<br/>länk&quot;) och svarar på frågorna. Eller så skriver man <a href="/texts/?text=4711">&lt;text 4711: en\ntegelsten&gt;</a>.');
      
      // This test shows that a <text ...> tag cannot contain other
      // tags (i.e. you can't nest tags).
      assert.equal(service.formatBody('<text 19914766: Hej>. <text 19914766: Hej då> ' +
                                      '<text 19914766>'),
                   '<a href="/texts/?text=19914766">&lt;text 19914766: Hej&gt;</a>. ' + 
                   '<a href="/texts/?text=19914766">&lt;text 19914766: Hej då&gt;</a> ' + 
                   '<a href="/texts/?text=19914766">&lt;text 19914766&gt;</a>');
    });
    
    test('should replace newlines with br tags', function() {
      assert.equal(service.formatBody('\n'), '<br/>');
      assert.equal(service.formatBody('\n\n'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n'), '<br/>');
      assert.equal(service.formatBody('\n\r'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n\n'), '<br/><br/>');
      assert.equal(service.formatBody('\r\n\r\n'), '<br/><br/>');
    });
    
    test('should escape html', function() {
      assert.equal(service.formatBody('&'), '&amp;');
      assert.equal(service.formatBody('<script>'), '&lt;script&gt;');
      assert.equal(service.formatBody('<script>alert("hej");</script>'),
                   '&lt;script&gt;alert(&quot;hej&quot;);&lt;/script&gt;');
    });
    
    test('should handle urls that are part of other urls', function() {
      var text = 'http://google.com\n and another url http://google.com/foo/bar';
      
      assert.equal(service.formatBody(text),
                   '<a target="_blank" href="http://google.com">http://google.com</a>' +
                   '<br/> and another url <a target="_blank" href="http://google.com/foo/bar">' +
                   'http://google.com/foo/bar</a>');
    });
    
    test('should handle url as part of conference name in links', function () {
      var text = "<möte 14567: KOMFeeder (-) www.skinnytaste.com/>";
      
      assert.equal(
        service.formatBody(text),
        '<a href="/conferences/14567">&lt;möte 14567: KOMFeeder (-) www.skinnytaste.com/&gt;</a>');
    });

    test('should match URLs that does not include protocol and add http:// to href but not text when missing', function () {
      var text = "www.google.com"

      assert.equal(
        service.formatBody(text),
        '<a target="_blank" href="http://www.google.com">www.google.com</a>');
    });

    test('should handle URLs starting with other protocols than http', function () {
      var text = "https://www.google.com"

      assert.equal(
        service.formatBody(text),
        '<a target="_blank" href="https://www.google.com">https://www.google.com</a>');
    });

    test('regression test for links in text 20542125', function () {
      var text = "Dricka te och l\u00e4sa en god bok?\nSpringa Kungsholmen runt?\n\nwww.gratisistockholm.nu/viewObject.aspx?objectId=83712\n\nwww.gratisistockholm.nu/viewObject.aspx?objectId=83623\n\nEller n\u00e5got annat."

      assert.equal(
        service.formatBody(text),
        'Dricka te och läsa en god bok?<br/>Springa Kungsholmen runt?<br/><br/><a target="_blank" href="http://www.gratisistockholm.nu/viewObject.aspx?objectId=83712">www.gratisistockholm.nu/viewObject.aspx?objectId=83712</a><br/><br/><a target="_blank" href="http://www.gratisistockholm.nu/viewObject.aspx?objectId=83623">www.gratisistockholm.nu/viewObject.aspx?objectId=83623</a><br/><br/>Eller något annat.');
    });

    test('bugzilla links', function () {
      var text = "https://bugzilla.mozilla.org/show_bug.cgi?id=432710";
      
      assert.equal(
        service.formatBody(text),
        '<a target="_blank" href="https://bugzilla.mozilla.org/show_bug.cgi?id=432710">https://bugzilla.mozilla.org/show_bug.cgi?id=432710</a>');
    });

  });
});
