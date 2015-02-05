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
var th = require('./helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONFIG = require('../config.js');
var log = new h.log0(CONFIG.testLoggerOptions);

var main = require('../src/main.js');

// used across tests
var password, password2;
var accountId = h.email2accountId(CONFIG.TEST.EMAIL);
var accountId2 = h.email2accountId(CONFIG.TEST.EMAIL2);

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

//
// Start the odata server
// -----------------------------

tap('setUp', function(test) {
  // setup here

  // It does for some reason not work to start the server from within the tests
  // The http requests are closed in the wrong place. Could have something to do
  // with error handling in the node process
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
    email: CONFIG.TEST.EMAIL
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
      email: CONFIG.TEST.EMAIL
    });

    th.httpRequest(options, jsonInput, function(data, statusCode) {
      var jsonData = h.jsonParse(data);
      log.debug('Received: ' + data);

      if (jsonData.d.results.password !== undefined) {
        moduleSelf.options.headers.password = password =
          jsonData.d.results.password;
        log.debug('Received password:' + password);
      }

      test.assert(statusCode === 200, 'reset_password');
      test.end();
    });

  });

});

tap('testing create_account and reset_password for test user #2',
  function(test) {

    // operation to test
    var options = {
      hostname: CONFIG.ODATA.HOST,
      port: CONFIG.ODATA.PORT,
      method: 'POST',
      path: '/create_account'
    };

    var jsonInput = JSON.stringify({
      email: CONFIG.TEST.EMAIL2
    });

    test.plan(2);

    th.httpRequest(options, jsonInput, function(data, statusCode) {
      var jsonData = h.jsonParse(data);
      log.debug('Received: ' + data);
      test.assert(statusCode === 200, 'create_account #2');

      options.path = '/' + moduleSelf.accountId2 + '/' +
      CONFIG.ODATA.SYS_PATH + '/reset_password';

      jsonInput = JSON.stringify({
        accountId: moduleSelf.accountId2,
        email: CONFIG.TEST.EMAIL2
      });

      th.httpRequest(options, jsonInput, function(data, statusCode) {
        var jsonData = h.jsonParse(data);
        log.debug('Received: ' + data);

        if (jsonData.d.results.password !== undefined) {
          password2 = jsonData.d.results.password;
          log.debug('Received password:' + password);
        }

        test.assert(statusCode === 200, 'reset_password #2');
        test.end();
      });

    });

  });

//
// Test tables
// ------------------

tap('testing create_table', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/create_table',
    headers: {
      user: accountId,
      password: password
    }
  };

  var tableDef = JSON.stringify({
    tableDef: {
      tableName: 'mytable',
      columns: ['col1 int', 'col2 varchar(255)']
    }
  });

  test.plan(1);

  th.httpRequest(options, tableDef, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'create_table');
    test.end();

  });

});

tap('testing insert', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId,
      password: password
    }
  };

  var input = JSON.stringify({
    col1: 22,
    col2: '22'
  });

  test.plan(1);

  th.httpRequest(options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'insert');
    test.end();
  });

});

tap('testing select', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId,
      password: password
    }
  };

  test.plan(1);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'select');
    test.end();
  });

});

tap('testing update', function(test) {

  moduleSelf.options.method = 'PUT';
  moduleSelf.options.path = '/' + accountId + '/mytable';

  var input = JSON.stringify({
    col2: '33'
  });

  test.plan(1);

  th.httpRequest(moduleSelf.options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'update');
    test.end();
  });

});

tap('testing select with user #2 before grant', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId2,
      password: password2
    }
  };

  test.plan(2);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'select with user #2 before grant');
    test.assert(jsonData.d.results.value.length == 0,
      'select with user #2 before grant');
    test.end();
  });

});

tap('testing grant', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/grant',
    headers: {
      user: accountId,
      password: password
    }
  };

  var input = JSON.stringify({
    tableName: 'mytable',
    accountId: accountId2
  });

  test.plan(1);

  th.httpRequest(options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'grant');
    test.end();
  });

});

tap('testing select with user #2 after grant', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId2,
      password: password2
    }
  };

  test.plan(2);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'select with user #2 after grant');
    test.assert(jsonData.d.results.value.length != 0,
      'select with user #2 after grant');
    test.end();
  });

});

tap('testing revoke', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/revoke',
    headers: {
      user: accountId,
      password: password
    }
  };

  var input = JSON.stringify({
    tableName: 'mytable',
    accountId: accountId2
  });

  test.plan(1);

  th.httpRequest(options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'grant');
    test.end();
  });

});

tap('testing select with user #2 after revoke', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId2,
      password: password2
    }
  };

  test.plan(2);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'select with user #2 after revoke');
    test.assert(jsonData.d.results.value.length == 0,
      'select with user #2 after revoke');
    test.end();
  });

});

tap('testing delete', function(test) {

  var filter = require("querystring").stringify({
    $filter: 'col1 eq 22'
  });

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'DELETE',
    path: '/' + accountId + '/mytable?' + filter,
    headers: {
      user: accountId,
      password: password
    }
  };

  test.plan(1);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'delete');
    test.end();
  });

});

tap('testing select after delete', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/mytable',
    headers: {
      user: accountId,
      password: password
    }
  };

  test.plan(2);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'select after delete');
    test.assert(jsonData.d.results.value.length == 0, 'select after delete');
    test.end();
  });

});

tap('testing service_def', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId,
    headers: {
      user: accountId,
      password: password
    }
  };

  test.plan(1);

  th.httpRequest(options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(true, 'service_def');
    test.end();

  });

});

//
// Test bucket privileges (more bucket tests in test_leveldb.js)
// -------------------------------------------------------------

tap('testing incorrect bucket admin operation', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/create_bucket2',
    headers: {
      user: accountId,
      password: password
    }
  };

  var bucket = JSON.stringify({name: 'b_mybucket'});

  test.plan(1);

  th.httpRequest(options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 406, 'incorrect admin operation');
    test.end();

  });

});

tap('testing create bucket', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/create_bucket',
    headers: {
      user: accountId,
      password: password
    }
  };

  var bucket = JSON.stringify({bucketName: 'b_mybucket'});

  test.plan(1);

  th.httpRequest(options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'create bucket');
    test.end();

  });

});

tap('testing write to bucket', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/b_mybucket',
    headers: {
      user: accountId,
      password: password
    }
  };

  var inData = 'Some data to write to the bucket...';

  test.plan(1);

  th.httpRequest(options, inData, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'write to bucket');
    test.end();

  });

});

tap('testing read from bucket', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'GET',
    path: '/' + accountId + '/b_mybucket',
    headers: {
      user: accountId,
      password: password
    }
  };

  test.plan(2);

  th.httpRequest(options, null, function(data, statusCode) {
    log.debug('Received: ' + data);
    test.assert(data === 'Some data to write to the bucket...',
                'testing read from bucket');
    test.assert(statusCode === 200, 'read from bucket');
    test.end();

  });

});

tap('testing drop bucket', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/drop_bucket',
    headers: {
      user: accountId,
      password: password
    }
  };

  var bucket = JSON.stringify({bucketName: 'b_mybucket'});

  test.plan(1);

  th.httpRequest(options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'drop bucket');
    test.end();

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
    email: CONFIG.TEST.EMAIL
  });

  test.plan(1);

  th.httpRequest(options, jsonInput, function(data, statusCode) {
    //var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'delete_account');
    test.end();
  });

});

tap('testing delete_account #2', function(test) {

  // operation to test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: CONFIG.ODATA.PORT,
    method: 'POST',
    path: '/' + accountId + '/' + CONFIG.ODATA.SYS_PATH + '/delete_account',
//    path: '/delete_account',
    headers: {
      user: accountId2,
      password: password2
    }
  };

  var jsonInput = JSON.stringify({
    email: CONFIG.TEST.EMAIL2
  });

  test.plan(1);

  th.httpRequest(options, jsonInput, function(data, statusCode) {
    //var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
    test.assert(statusCode === 200, 'delete_account #2');
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
