// stress_test.js
//------------------------------
//
// 2015-01-30, Jonas Colmsjö
//------------------------------
//
// Load the odata server and see how response times are affected
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

//
// Whatever setup that is neede
// ----------------------------

var h = require('../src/helpers.js');
var th = require('./helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONFIG = require('../config.js');
var log = new h.log0(CONFIG.testLoggerOptions);


// used across tests
var moduleSelf = this;
moduleSelf.password = moduleSelf.password2 = null;
moduleSelf.accountId = h.email2accountId(CONFIG.TEST.EMAIL);
moduleSelf.accountId2 = h.email2accountId(CONFIG.TEST.EMAIL2);

// operation to test
moduleSelf.options = {
  hostname: CONFIG.ODATA.HOST,
  port: CONFIG.ODATA.PORT,
};



var createAccount = function(cb) {

  // First create an account and get a password
  // ------------------------------------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/create_account';

  var jsonInput = JSON.stringify({
    email: CONFIG.TEST.EMAIL
  });

  th.httpRequest(moduleSelf.options, jsonInput, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);

    moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
      CONFIG.ODATA.SYS_PATH + '/reset_password';

    jsonInput = JSON.stringify({
      accountId: moduleSelf.accountId,
      email: CONFIG.TEST.EMAIL
    });

    th.httpRequest(moduleSelf.options, jsonInput, function(data, statusCode) {
      var jsonData = h.jsonParse(data);
      log.debug('Received: ' + data);

      moduleSelf.password = jsonData.d.results.password;
      log.debug('Received password:' + moduleSelf.password);

      // create the header with credentials that is used in all requests
      moduleSelf.options.headers = {
        user: moduleSelf.accountId,
        password: moduleSelf.password
      };

      // Run the callback doing some work
      cb();
    });
  });
};

// 11 requests are performed
var runTest = function() {

  // Create table
  // ------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
    CONFIG.ODATA.SYS_PATH + '/create_table';

  var tableDef = JSON.stringify({
    tableDef: {
      tableName: 'mytable',
      columns: ['col1 int', 'col2 varchar(255)']
    }
  });

  th.httpRequest(moduleSelf.options, tableDef, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Insert into table
  // -----------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/mytable';

  var input = JSON.stringify({
    col1: 22,
    col2: '22'
  });

  th.httpRequest(moduleSelf.options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Select from table
  // -----------------

  moduleSelf.options.method = 'GET';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/mytable';

  th.httpRequest(moduleSelf.options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Grant table
  // ------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
    CONFIG.ODATA.SYS_PATH + '/grant';

  input = JSON.stringify({
    tableName: 'mytable',
    accountId: moduleSelf.accountId2
  });

  th.httpRequest(moduleSelf.options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Revoke table
  // ------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' + CONFIG.ODATA.SYS_PATH +
    '/revoke';

  input = JSON.stringify({
    tableName: 'mytable',
    accountId: moduleSelf.accountId2
  });


  th.httpRequest(moduleSelf.options, input, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });


  // Delete from table
  // -----------------

  var filter = require("querystring").stringify({
    $filter: 'col1 eq 22'
  });

  moduleSelf.options.method = 'DELETE';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/mytable?' + filter;

  th.httpRequest(moduleSelf.options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });


  // Select from table
  // -----------------

  moduleSelf.options.method = 'GET';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/mytable';

  th.httpRequest(moduleSelf.options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Service definition
  // ------------------

  moduleSelf.options.method = 'GET';
  moduleSelf.options.path = '/' + moduleSelf.accountId;

  th.httpRequest(moduleSelf.options, null, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Incorrect bucket admin op
  // -------------------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
    CONFIG.ODATA.SYS_PATH + '/create_bucket2';

  var bucket = JSON.stringify({
    name: 'b_mybucket'
  });

  th.httpRequest(moduleSelf.options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Create bucket
  // -------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
    CONFIG.ODATA.SYS_PATH + '/create_bucket';

  bucket = JSON.stringify({
    bucketName: 'b_mybucket'
  });

  th.httpRequest(moduleSelf.options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

  // Drop bucket
  // -------------

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/' + moduleSelf.accountId + '/' +
    CONFIG.ODATA.SYS_PATH + '/drop_bucket';

  bucket = JSON.stringify({
    bucketName: 'b_mybucket'
  });

  th.httpRequest(moduleSelf.options, bucket, function(data, statusCode) {
    var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);

  });

};


//
// Cleanup
// ------------------

var cleanUp = function() {

  moduleSelf.options.method = 'POST';
  moduleSelf.options.path = '/delete_account';

  var jsonInput = JSON.stringify({
    email: CONFIG.TEST.EMAIL
  });


  th.httpRequest(moduleSelf.options, jsonInput, function(data, statusCode) {
    //var jsonData = h.jsonParse(data);
    log.debug('Received: ' + data);
  });

};

var everySec = function(func, numTimes, endFunc) {
  var self = this;
  return function() {
    self.i = 0;
    self.interval = setInterval(function() {
      if (self.i++ == numTimes) {
        self.interval.clearInterval();
        endFunc();
      } else {
        func();
      }
    }, 1000);
  }
};

//
// Main
// -----

var times = function(n, func, endFunc) {
  return function() {
    var i = 0;
    while (i++ < n) {
      func();
    }
    if (endFunc !== undefined) {
      endFunc();
    }
  };
};

// Run the test 40 times every second. The test performs 11 requests
// => 440 requests per second can be handled
createAccount(everySec(times(20, runTest), 100, cleanUp));
