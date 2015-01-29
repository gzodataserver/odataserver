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

  //
  // Helper for making http requests
  // -------------------------------

  h.httpRequest = function(options, input, done) {
    var _data = '';

    var func = function(res) {
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
