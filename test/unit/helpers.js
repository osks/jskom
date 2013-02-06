'use strict';

function assertResolved($rootScope, promise, assertFunc) {
  var wasResolved = false;
  promise.then(function () {
    assertFunc.apply(null, arguments);
    wasResolved = true;
  });
  $rootScope.$digest();
  
  assert.isTrue(wasResolved, 'promise was not resolved');
}

function assertRejected($rootScope, promise, assertFunc) {
  var wasRejected = false;
  promise.then(null, function () {
    assertFunc.apply(null, arguments);
    wasRejected = true;
  });
  $rootScope.$digest();
  
  assert.isTrue(wasRejected, 'promise was not rejected');
}
