// test_main.js
//------------------------------
//
// 2014-12-09, Jonas Colmsjö
//------------------------------
//
// Test main.js
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

var moduleSelf = this;

var tap = require('tape');
var http = require('http');
var express = require('express');

var config = require('../src/config.js');
global.CONFIG = new config({});

var h = require('../src/helpers.js');
var th = require('./helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONSTANTS = require('../src/constants.js');
var log = new h.log0(CONSTANTS.testLoggerOptions);

var server;

moduleSelf.options = {
  hostname: global.CONFIG.ODATA.HOST,
  port: global.CONFIG.ODATA.PORT,
  headers: {
    user: h.email2accountId(CONSTANTS.TEST.EMAIL),
    database: h.email2accountId(CONSTANTS.TEST.EMAIL)
  }
};

console.log(global.CONFIG);
//
// Start the odata server
// -----------------------------

tap('setUp', function(test) {
  // setup here

  var express = require('express');
  var odataserver = require('../src/main.js');

  var odata = new odataserver({});

  var app = express();
  odata.init(app);

  server = app.listen(global.CONFIG.ODATA.PORT, function() {
    console.log('OData Server listening at http://%s:%s',
                global.CONFIG.ODATA.HOST, global.CONFIG.ODATA.PORT);
  });

  // setup finished
  test.end();
});

// 1. Create a new account. An account ID will be returned, please note this:
// `curl -X POST -v --data "{email: 'joe@example.com'}" http://[IP]:[PORT]/s/create_account`
//
// 2. Get a password for joe (this password will be sent by mail in the future):
// `curl -X POST -v --data "{accountId: '3ea8f06baf64'}" http://[IP]:[PORT]/s/reset_password`

//
// Test create account and reset password
// --------------------------------------

tap('testing create_account and reset_password', function(test) {

  // operation to test
  var options = h.clone(moduleSelf.options);
  options.method = 'POST';
  options.path = '/create_account';

  var jsonInput = JSON.stringify({
    email: CONSTANTS.TEST.EMAIL
  });

  test.plan(2);

  th.httpRequest(options, jsonInput, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ', data);
    test.assert(statusCode === 200, 'create_account');

    var options = h.clone(moduleSelf.options);
    options.method = 'POST';
    options.path = '/' + moduleSelf.options.headers.user + '/' +
      global.CONFIG.ODATA.SYS_PATH + '/reset_password';

    jsonInput = JSON.stringify({
      accountId: moduleSelf.options.headers.user,
      email: CONSTANTS.TEST.EMAIL
    });

    th.httpRequest(options, jsonInput, function(data, statusCode) {
      var jsonData = h.jsonParse(data);
      log.debug('Received: ' + data);

      if (jsonData.d.password !== undefined) {
        moduleSelf.options.headers.password = jsonData.d.password;
        log.debug('Received password:' + moduleSelf.options.headers.password);
      }

      test.assert(statusCode === 200, 'reset_password');
      test.end();
    });

  });

});

//
// Cleanup
// ------------------

tap('testing delete_account', function(test) {

  var options = h.clone(moduleSelf.options);

  // operation to test
  options.method = 'POST';
  options.path = '/' + moduleSelf.options.headers.user + '/' +
                global.CONFIG.ODATA.SYS_PATH + '/delete_account';

  var jsonInput = JSON.stringify({
    email: CONSTANTS.TEST.EMAIL
  });

  test.plan(1);

  th.httpRequest(options, jsonInput, function(data, statusCode) {
    //var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'delete_account');
    test.end();
  });

});

//
// Stop the odata server
// -----------------------------

tap('tearDown', function(test) {
  // setup here

  server.close();

  // setup finished
  test.end();
});
