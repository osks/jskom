'use strict';

suite('Reader', function () {
  //setup(module('jskom.services'));
  
  var _reader, _getTextDeferred, _textsServiceStub, _$rootScope, _$q, _$log;
  setup(inject(function ($rootScope, $q, $log) {
    _$rootScope = $rootScope;
    _$q = $q;
    _$log = $log;
    
    _getTextDeferred = $q.defer();
    _textsServiceStub = {
      // TODO: Would be nice if we could expect/check the textNo 
      getText: sinon.stub().returns(_getTextDeferred.promise)
    };
    
    // Right now we don't test anything that uses anything other than
    // the textsService, so we just give it nulls instead for now.
    _reader = new jskom.Reader(_$log, _$q, _textsServiceStub,
                               null /*conn*/, null /*unreadQueue*/);
  }));
  
  suite('getNextUnreadText', function () {
    test('should resolve with null if there are no unread texts', function () {
      var promise = _reader._getNextUnreadText([], [], null, _$q);
      
      assertResolved(_$rootScope, promise, function (unreadTextNo) {
        assert.isNull(unreadTextNo);
      });
    });
    
    test('should resolve with last text in stack if the stack is not empty', function () {
      _getTextDeferred.resolve({ comment_in_list: [] });
      var promise = _reader._getNextUnreadText([1, 2], [2, 1]);
      
      assertResolved(_$rootScope, promise, function (unreadTextNo) {
        assert.strictEqual(unreadTextNo, 1);
      });
    });

    test('should resolve with lowest text number if the stack is empty', function () {
      _getTextDeferred.resolve({ comment_in_list: [] });
      var promise = _reader._getNextUnreadText([3, 1, 2], []);
      
      assertResolved(_$rootScope, promise, function (unreadTextNo) {
        assert.strictEqual(unreadTextNo, 1);
      });
    });

    test('should reject if getTextFuncPromise rejects', function () {
      _getTextDeferred.reject(17);
      var promise = _reader._getNextUnreadText([3, 1, 2], []);
      
      assertRejected(_$rootScope, promise, function (response) {
        assert.strictEqual(response, 17);
      });
    });
    
    test('should push unread comments onto stack in reverse order', function () {
      var threadStack = [1];
      _getTextDeferred.resolve({ comment_in_list: [ { text_no: 2 }, { text_no: 3 } ] });
      var promise = _reader._getNextUnreadText([1, 2, 3], threadStack);
      
      assertResolved(_$rootScope, promise, function (unreadTextNo) {
        assert.deepEqual(threadStack, [3, 2]);
      });
    });

    test('should only push unread comments onto stack', function () {
      var threadStack = [1];
      _getTextDeferred.resolve({ comment_in_list: [ { text_no: 2 }, { text_no: 3 } ] });
      var promise = _reader._getNextUnreadText([1, 2], threadStack);
      
      assertResolved(_$rootScope, promise, function (unreadTextNo) {
        assert.deepEqual(threadStack, [2]);
      });
    });

  });
  
  suite('getFirstUnreadText', function () {
    test('should pop and return from the stack when the thread stack is not empty', function () {
      var unreadTextNo = _reader._getFirstUnreadText([1, 2, 3], [1, 2]);
      
      assert.strictEqual(unreadTextNo, 2);
    });
    
    test('should return the lowest text number when the thread stack is empty', function () {
      var unreadTextNo = _reader._getFirstUnreadText([3, 1, 2], []);
      
      assert.strictEqual(unreadTextNo, 1);
    });
    
    test('should return the unread text when only one unread text', function () {
      var unreadTextNo = _reader._getFirstUnreadText([1], []);
      
      assert.strictEqual(unreadTextNo, 1);
    });
    
    test('should return null when there are no unread texts', function () {
      var unreadTextNo = _reader._getFirstUnreadText([], []);
      
      assert.isNull(unreadTextNo);
    });
  });
});
