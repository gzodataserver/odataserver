// test_main.js
//------------------------------
//
// 2014-12-09, Jonas Colmsjö
//
//------------------------------
//
// Test main.js
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

var tap = require('tape');
var http = require('http');
var express = require('express');

var h = require('../src/helpers.js');
var th = require('./helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONFIG = require('../config.js');
var CONSTANTS = require('../src/constants.js');
var log = new h.log0(CONSTANTS.testLoggerOptions);


// used across tests
var password, password2;
var accountId = h.email2accountId(CONSTANTS.TEST.EMAIL);
var accountId2 = h.email2accountId(CONSTANTS.TEST.EMAIL2);

var moduleSelf = this;
moduleSelf.accountId = accountId;
moduleSelf.accountId2 = accountId2;

// operation to test
moduleSelf.options = {
  hostname: CONFIG.ODATA.HOST,
  port: CONFIG.ODATA.PORT,
  headers: {
    user: accountId
  }
};

var server;

//
// Start the odata server
// -----------------------------

tap('setUp', function(test) {
  // setup here

  var express = require('express');
  var app = express();

  // Outside the package would this be:
  // `var odataserver = require('odataserver');`
  var odataserver = require('../src/main.js');
  odataserver.init(app);

  server = app.listen(CONFIG.ODATA.PORT, function() {

    console.log('Example app listening at http://%s:%s', CONFIG.ODATA.HOST,
                CONFIG.ODATA.PORT);

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
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/create_account'
  };

  var jsonInput = JSON.stringify({
    email: CONSTANTS.TEST.EMAIL
  });

  test.plan(2);

  th.httpRequest(options, jsonInput, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'create_account');

    options.path = '/' + moduleSelf.accountId + '/' +
      CONFIG.ODATA.SYS_PATH + '/reset_password';

    jsonInput = JSON.stringify({
      accountId: moduleSelf.accountId,
      email: CONSTANTS.TEST.EMAIL
    });

    th.httpRequest(options, jsonInput, function(data, statusCode) {
      var jsonData = h.jsonParse(data);
      log.debug('Received: ' + data);

      if (jsonData.d.password !== undefined) {
        moduleSelf.options.headers.password = password =
          jsonData.d.password;
        log.debug('Received password:' + password);
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

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/delete_account',
    //    path: '/delete_account',
    headers: {
      user: accountId,
      password: password
    }
  };

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
