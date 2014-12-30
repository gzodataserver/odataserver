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

var h = require('../src/helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONFIG = require('../src/config.js');
var log = new h.log0(CONFIG.testLoggerOptions);

var main = require('../src/main2.js');


//
// Helper for making http requests
// -------------------------------

var httpRequest = function(options, input, done) {
  var _data = '';

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      log.debug('httpRequest:data:'+chunk);
      _data += chunk;
    });

    res.on('end', function() {
      log.debug('httpRequest:end:'+_data);
      done(_data);
    });
  });

  req.on('error', function(e) {
    log.log('problem with request: ' + e.message);
  });

  if(input !== null) req.write(input);

  req.end();
};

//
// Start the odata server
// -----------------------------

tap('setUp', function(test) {
  // setup here

  main.start();

  // setup finished
  test.end();
});


// 1. Create a new account. An account ID will be returned, please note this:
// `curl -X POST -v --data "{email: 'joe@example.com'}" http://[IP]:[PORT]/s/create_account`
//
// 2. Get a password for joe (this password will be sent by mail in the future):
// `curl -X POST -v --data "{accountId: '3ea8f06baf64'}" http://[IP]:[PORT]/s/reset_password`

//
// Test create account
// -----------------------

tap('testing create_account', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/'+CONFIG.ODATA.SYS_PATH+'/create_account',
  };

  var jsonInput = JSON.stringify({email: CONFIG.TEST.EMAIL});

  test.plan(1);

  httpRequest(options, jsonInput, function(data) {
    //var jsonData = h.jsonParse(data);
    log.debug('Received: '+data);
    test.assert(true, 'create_account');
    test.end();
  });

/*
  options.path = '/'+CONFIG.ODATA.SYS_PATH+'/reset_password';
  jsonInput = JSON.stringify({});

  httpRequest(options, jsonInput, function(data) {
    //var jsonData = h.jsonParse(data);
    test.assert(true, 'reset_password');
    test.end();
  });
*/

});

//
// Test create_table
// ------------------

/*
tap('testing create_table', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/'+CONFIG.ODATA.SYS_PATH+'/create_table',
    headers: {
      user: CONFIG.RDBMS.ADMIN_USER,
      password: CONFIG.RDBMS.ADMIN_PASSWORD
    }
  };

  var tableDef = JSON.stringify({table_name: 'mytable', columns: ['col1 int','col2 varchar(255)']});

  test.plan(1);

  httpRequest(options, tableDef, function(data) {
    //var jsonData = h.jsonParse(data);

    test.assert(true, 'create_table');
    test.end();

  });

});
*/

//
// Stop the odata server
// -----------------------------

/*
tap('tearDown', function(test) {
  // setup here

  main.stop();

  // setup finished
  test.end();
});

*/
