// test_leveldb.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Template for tests
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//
// Run like this: `./node_modules/.bin/nodeunit test_leveldb.js`
// Install dependencies first: `npm install`


/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/


// Nodeunit test
// -------------


var h = require('../src/helpers.js');
var CONFIG = require('../src/config.js');

var defaultPort = CONFIG.ODATA.PORT;
var log = new h.log0(CONFIG.testLoggerOptions);

exports['test.leveldb'] = {

  setUp: function(done) {
    var self=this;

    var http = require("http");
    var level = require('./../src/leveldb.js');

    self.server = http.createServer(function(request, response) {

      log.log("Processing request: " +
        JSON.stringify(request.method) + " - " +
        JSON.stringify(request.url) + " - " +
        JSON.stringify(request.headers));

      // handle request with leveldb
      var leveldb = new level.LevelDBHttpServer();
      leveldb.main(request, response);

    });

    self.server.listen(defaultPort);

    log.log("Server is listening on port " + defaultPort);

    // setup finished
    done();
  },

  tearDown: function(done) {
    var self=this;
    self.server.close();
    done();
  },

  'testing POST': function(test) {
    var self = this;
    test.expect(2);

    var h = require('../src/helpers.js');
    h.debug = true;

    log.debug('Start of testing POST');

    fs = require('fs');
    var readStream = fs.createReadStream(__dirname+'/projektledning_w767.png');

    readStream.on('open', function() {
      log.debug('in readStream on open');

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
        log.debug('in http.request');
        res.setEncoding('utf8');

        test.ok(true, 'Did not receive what we expected.');

        res.on('data', function(chunk) {
          log.debug('in http.request on data: ' + chunk);
          data += chunk;
        });

        res.on('end', function() {
          log.debug('in http.response end for POST');

          req.end();

          var data = '',
            counter = 0;

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

            test.ok(true, 'Did not receive what we expected.');

            res.on('data', function(chunk) {
              data += chunk;
              counter++;
              log.debug('in response for GET request: counter=' + counter);
            });

            res.on('end', function() {
              log.debug('Number of chunks received: ' + counter + ' calling test.done');
              test.done();
            });
          });

          req2.on('error', function(e) {
            console.log('problem with request: ' + e.message);
          });

          req2.end();

        });


      });

      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
      });


      // This just pipes the read stream to the response object (which goes to the client)
      log.debug('will now pipe readStream with http request');
      readStream.pipe(req);

    });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    readStream.on('error', function(err) {
      console.log('Error: ' + err);
    });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    readStream.on('end', function() {
      log.debug('readStream on end - nothing more to read');
    });

  }

};
