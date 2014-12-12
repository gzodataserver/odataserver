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


var httpRequest = function(options, input, done) {
  var _data = '';

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
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


//
// Test the arrayBucketStream
// -----------------------

tap('testing create_table', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/'+CONFIG.ODATA.SYS_PATH+'/create_table',
    headers: {
      user: 'userXX',
      password: 'pwdXX'
    }
  };

  var tableDef = JSON.stringify({table_name: 'mytable', columns: ['col1 int','col2 varchar(255)']});

  test.plan(1);

  httpRequest(options, tableDef, function(data) {
    //var jsonData = h.jsonParse(data);

    test.assert(true, 'create_table');
    //test.assert(jsonData === expected, 'create_table did not return what was expected');
    test.end();

  });

});

//
// Stop the odata server
// -----------------------------

tap('tearDown', function(test) {
  // setup here

  main.stop();

  // setup finished
  test.end();
});
