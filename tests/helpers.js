// helpers.js
//------------------------------
//
// 2015-01-15, Jonas Colmsjö
//
//------------------------------
//
// Misc helpers fucntions
//
//
// Using Google JavaScript Style Guide
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

(function(moduleSelf, undefined) {

  var h = {};

  var http = require('http');
  var https = require('https');
  var h = require('../src/helpers.js');

  var CONFIG = require('../src/config.js');
  var log = new h.log0(CONFIG.testLoggerOptions);

  // Measure the latency in the https requests using
  // an exponentially smoothed moving average (since it is easy to calculate)
  moduleSelf.latency = 0;
  moduleSelf.weight = 0.2;
  moduleSelf.logIntervall = 100;
  moduleSelf.counter = 0;

  //
  // Helper for making http requests
  // -------------------------------

  h.httpRequest = function(options, input, done) {
    var _data = '';
    var beforeReq = Date.now();

    var func = function(res) {
      // Keep track of the latency (handy when running the stress tests)
      var receivedRes = Date.now();
      moduleSelf.latency = (receivedRes - beforeReq) * moduleSelf.weight +
                           (1 - moduleSelf.weight) * moduleSelf.latency;

      if (moduleSelf.counter++ % moduleSelf.logIntervall === 0) {
        log.log('httpRequest average latency: ' + moduleSelf.latency +
                '(ms)' +
                '[beforeReq: ' + beforeReq + ' receivedRes: ' + receivedRes +
                ' diff: ' + (receivedRes - beforeReq) + ']');
      }

      log.debug('status code:' + res.statusCode + ', headers: ' +
      JSON.stringify(res.headers));

      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        _data += chunk;
      });

      res.on('end', function() {
        done(_data, res.statusCode);
      });
    };

    // Using a self-signed certificate for development and testing
    options.rejectUnauthorized = false;

    if (CONFIG.HTTPS_OPTIONS.USE_HTTPS) {
      // use a secure https server
      req = https.request(options, func);
    } else {
      // use a plain old http server
      req = http.request(options, func);
    }

    req.on('error', function(e) {
      log.log('problem with request: ' + e.message);
    });

    if (input !== null) {
      req.write(input);
    }

    req.end();
  };

  // Exports
  // =======

  module.exports = h;

})(this);
