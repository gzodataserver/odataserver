// main.js
//------------------------------
//
// 2014-12-06, Jonas Colmsjö
//
//------------------------------
//
// This is the top file in the hierarchy. The architedture looks like this:
//
//     +-------------+
//     | odataserver |
//     +------+------+
//            |
//      +-----+-----+
//      |           |
//      v           v
//  +-------+  +---------+
//  | mysql |<-| leveldb |
//  +-------+  +---------+
//
//
// LevelDB is a in-process library key/value store is currently used for buckets.
// This means that there only can be one process for each accountId (i.e.
// ordinary application server clusters are not supported but a sharded setup
// can be used).
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//
// Install with: `npm install`
// Run with: `npm start`
//

(function(moduleSelf, undefined) {

  var https = require('https');
  var http = require('http');
  var url = require('url');
  var test = require('tape');
  var fs = require('fs');
  var toobusy = require('toobusy');

  var CONFIG = require('./config.js');
  var odata = require('./odataserver.js');
  var h = require('./helpers.js');

  var log = new h.log0(CONFIG.mainLoggerOptions);

  var rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);
  var buckets = require(CONFIG.ODATA.BUCKET_BACKEND);

  var server;

  //
  // Module helpers
  // --------------

  var showHelp = function(request, response) {
    log.debug('Showing help');

    var fileStream = fs.createReadStream(CONFIG.ODATA.HELP_FILE);
    response.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    fileStream.pipe(response);
  };


  moduleSelf.tooBusy = false;
  var setupTooBusy = function() {
      var ts = Date.now();
      var lastTs = ts;
      setInterval(function() {
        ts = Date.now();
        moduleSelf.tooBusy = (ts - lastTs) > 505;
        lastTs = ts;

        if (moduleSelf.tooBusy) {
          log.log("ALERT: Server tooBusy!");
        }

      }, 500);
  };

  //
  // Start the OData server
  // ---------------------

  exports.start = function() {

    setupTooBusy();

    // handle request with odata server
    var odataServer = new odata.ODataServer();

    var httpFunc = function(request, response) {

      if(toobusy()) {
        var msg = 'Server too busy!';
        h.writeError(response, msg);
        log.log(msg);
        return;
      }

      // Only GET, POST, PUT and DELETE supported
      if (!(request.method == 'GET' ||
          request.method == 'POST' ||
          request.method == 'DELETE')) {

        h.writeError(response, request.method + ' not supported.');
      }

      var parsedURL = url.parse(request.url, true, false);
      var a_ = parsedURL.pathname.split("/");

      // drop the first element which is an empty string
      var tokens_ = a_.splice(1, a_.length);

      var str = "Processing request: " +
        JSON.stringify(request.method) + " - " +
        JSON.stringify(request.url) + " - " +
        JSON.stringify(request.headers);

      // log and fire dtrace probe
      log.log(str);
      h.fireProbe(str);

      // Show the help
      if (tokens_[0] === CONFIG.ODATA.HELP_PATH) {
        showHelp(request, response);
        return;
      }

      // Check that the url has table/bucket or system operation
      if (tokens_[0] !== 'create_account' &&
          tokens_[0] !== 'delete_account' &&
          tokens_.length <= 1) {
        h.writeError(response, 'Invalid operation: ' + request.method +
                                ' ' + request.url);
        return;
      }

      // tokens_ should contain [ account, table ] or
      // [ account, 's', system_operation ] now

      // Check that the system operations are valid
      if (tokens_.length === 3 &&
          tokens_[1] === CONFIG.ODATA.SYS_PATH &&
          !odata.isAdminOp(tokens_[2]) &&
          !buckets.isAdminOp(tokens_[2])) {
        h.writeError(response, "Invalid system operation. " + tokens_[2]);
        return;
      }

      // Check if this is an operation on a bucket by looking for the b_
      // prefix, tokens_ = [ account, 'b_'bucket] or
      //                   [ account, 's', 'create_bucket' | 'delete_bucket' ]
      if ((tokens_.length === 3 && buckets.isAdminOp(tokens_[2])) ||
          (tokens_.length === 2 &&
            tokens_[1].substr(0, CONFIG.ODATA.BUCKET_PREFIX.length) ===
            CONFIG.ODATA.BUCKET_PREFIX)) {
        log.debug("Bucket operation: " +  tokens_[2]);
        var bucketServer = new buckets.BucketHttpServer();
        bucketServer.main(request, response);
        return;
      }

      // Handle the request
      odataServer.main(request, response);

      // NOTE: The response object should not be closed explicitly here

    };

    // start http server
    // -----------------

    if (CONFIG.HTTPS_OPTIONS.USE_HTTPS) {
      // use a secure https server

      log.log('Use HTTPS.');

      var httpsOptions = {
        key: fs.readFileSync(CONFIG.HTTPS_OPTIONS.KEY_FILE),
        cert: fs.readFileSync(CONFIG.HTTPS_OPTIONS.CERT_FILE)
      };

      moduleSelf.server = https.createServer(httpsOptions, httpFunc);

    } else {
      // use a plain old http server
      log.log('Use HTTP.');
      moduleSelf.server = http.createServer(httpFunc);
    }

    moduleSelf.server.listen(CONFIG.ODATA.PORT);

    log.log("Server is listening on port " + CONFIG.ODATA.PORT);

  };

  //
  // Stop the OData server
  // ---------------------

  exports.stop = function() {
    moduleSelf.server.close();
  };

})(this);
