// test_leveldb.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Test for bucket server
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//
// Run like this: `./node_modules/.bin/nodeunit test_leveldb.js`
// Install dependencies first: `npm install`

var tap = require('tape');

var h = require('../src/helpers.js');
var th = require('./helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var CONFIG = require('../src/config.js');

var defaultPort = CONFIG.ODATA.PORT;
var log = new h.log0(CONFIG.testLoggerOptions);

var server;

// used across tests
var password, password2;
var accountId = h.email2accountId(CONFIG.TEST.EMAIL);
var accountId2 = h.email2accountId(CONFIG.TEST.EMAIL2);

//
// Start the server
// ---------------

tap('setUp', function(test) {
  var http = require("http");
  var level = require('./../src/' + CONFIG.ODATA.BUCKET_BACKEND);

  server = http.createServer(function(request, response) {

    log.log("Processing request: " +
      JSON.stringify(request.method) + " - " +
      JSON.stringify(request.url) + " - " +
      JSON.stringify(request.headers));

    // handle request with leveldb
    var leveldb = new level.BucketHttpServer();
    leveldb.handleReadWriteRequest(request, response);

  });

  server.listen(defaultPort);

  log.log("Server is listening on port " + defaultPort);

  // setup finished
  test.end();
});

//
// Test write and read
// -------------------

tap('testing POST', function(test) {
  test.plan(2);

  var h = require('../src/helpers.js');
  h.debug = true;

  fs = require('fs');
  var readStream = fs.createReadStream(__dirname + '/projektledning_w767.png');

  readStream.on('open', function() {

    var http = require('http');

    // path and method is set in each test
    this.options = {
      hostname: CONFIG.ODATA.HOST,
      port: defaultPort,
      headers: {
        user: 'wp',
        password: 'wp',
        //					'content-type': 'application/octet-stream'
      }
    };

    this.options.method = 'POST';
    this.options.path = '/image1';

    var data = '';

    var req = http.request(this.options, function(res) {
      res.setEncoding('utf8');

      test.ok(true, 'In POST operation.');

      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        req.end();

        var data = '';
        var counter = 0;

        // path and method is set in each test
        var options2 = {
          hostname: CONFIG.ODATA.HOST,
          port: defaultPort,
          method: 'GET',
          path: '/image1',
          headers: {
            user: 'wp',
            password: 'wp'
          }
        };

        var req2 = http.request(options2, function(res) {
          res.setEncoding('utf8');

          test.ok(true, 'In GET operation fetching what we just POSTed');

          res.on('data', function(chunk) {
            data += chunk;
            counter++;
          });

          res.on('end', function() {
            test.end();
          });
        });

        req2.on('error', function(e) {
          log.log('problem with request: ' + e.message);
        });

        req2.end();

      });

    });

    req.on('error', function(e) {
      log.log('problem with request: ' + e.message);
    });

    // This just pipes the read stream to the response object (which goes to the client)
    readStream.pipe(req);

  });

  // This catches any errors that happen while creating the readable stream (usually invalid names)
  readStream.on('error', function(err) {
    log.log('Error: ' + err);
  });

  // This catches any errors that happen while creating the readable stream (usually invalid names)
  readStream.on('end', function() {
    log.debug('readStream on end - nothing more to read');
  });

});

//
// Stop the server
// ---------------

tap('tearDown', function(test) {
  server.close();
  test.end();
});
