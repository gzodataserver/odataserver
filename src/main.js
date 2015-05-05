// main.js
//--------
//
// 2014-12-06, Jonas Colmsjö
//------------------------------
//
// This is the top file in the hierarchy. The architedture looks like this:
//
//       +-------------------+
//       |        main       |
//       +------+---------+--+
//              |         |
//              v         |
//       +-------------+  |
//       | odataserver |  |
//       +--+----------+  |
//          |             |
//          |             |
//          |             |
//          v             v
//      +-------+    +---------+
//      | mysql |<---| leveldb |
//      +-------+    +---------+
//
//
// LevelDB is an in-process library key/value store is currently used for buckets.
// This means that there only can be one process for each accountId (i.e.
// ordinary application server clusters are not supported but a sharded setup
// can be used).
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

(function(moduleSelf, undefined) {

  var https = require('https');
  var http = require('http');
  var url = require('url');
  var fs = require('fs');

  var CONFIG = require('../config.js');
  var odata = require('./odataserver.js');
  var h = require('./helpers.js');

  var log = new h.log0(CONFIG.mainLoggerOptions);

  var rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);
  var buckets = require(CONFIG.ODATA.BUCKET_BACKEND);
  var middleware = require('./middleware.js');

  var server;

  //
  // Module helpers
  // --------------

  // Experimental - the RDBMS is likely the bottleneck, **not** this
  // NodeJS process
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

  var tokenize = h.tokenize;

  //
  // Middleware
  // ----------

  var checkMethod = function(req, res, next) {

    // do nothing if the response is closed
    if (res.finished) {
      next();
      return;
    }

    // Only GET, POST, PUT and DELETE supported
    if (!(req.method == 'GET' ||
        req.method == 'POST' ||
        req.method == 'PUT' ||
        req.method == 'DELETE' ||
        req.method == 'OPTIONS')) {

      h.writeError(res, req.method + ' not supported.');
    }

    next();
  };

  var allowCors = function(req, res, next) {

    // do nothing if the response is closed
    if (res.finished) {
      next();
      return;
    }

    // Allow CORS
    if (CONFIG.ODATA.ALLOW_CORS && req.headers['origin']) {
      var origin = req.headers['origin'];
      log.debug('CORS headers set. Allowing the clients origin: ' + origin);

      res.setHeader('Access-Control-Allow-Origin', origin);

      res.setHeader('Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, ' +
        'user, password');

      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // The response to `OPTIONS` requests is always the same empty message
    if (req.method == 'OPTIONS') {
      res.end();
    }

    next();
  };

  var logRequest = function(req, res, next) {

    // do nothing if the response is closed
    if (res.finished) {
      next();
      return;
    }

    var str = "Processing request: " +
      JSON.stringify(req.method) + " - " +
      JSON.stringify(req.url) + " - " +
      JSON.stringify(req.headers);

    // log and fire dtrace probe
    log.log(str);
    h.fireProbe(str);

    next();
  };

  var isHelpOp = function(url) {
    var tokens = tokenize(url);

    return (tokens[0] === CONFIG.ODATA.HELP_PATH);
  };

  var matchHelp = function(req, res, next) {

    // do nothing if the response is closed
    if (res.finished) {
      next();
      return;
    }

    var tokens = tokenize(req.url);

    // Show the help
    if (isHelpOp(req.url)) {
      log.debug('Showing help');

      var path = require('path');
      var fs = require('fs');
      var dir = path.join(path.dirname(fs.realpathSync(__filename)), '../');

      var fileStream = fs.createReadStream(dir + CONFIG.ODATA.HELP_FILE);
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });

      fileStream.on('end', function() {
        next();
      });

      fileStream.pipe(response);
      return;
    }

    next();
  };

  var isValidSystemOp = function(url) {
    var tokens = tokenize(url);

    return (tokens.length === 3 &&
            tokens[1] === CONFIG.ODATA.SYS_PATH &&
            !odata.isAdminOp(tokens[2]) &&
            !buckets.isAdminOp(tokens[2]));
  };

  var performChecks = function(req, res, next) {
    // do nothing if the response is closed
    if (res.finished) {
      next();
      return;
    }

    /*
    Breaks service_def
    // Check that the url has table/bucket or system operation
    if (tokens_[0] !== 'create_account' &&
    tokens_[0] !== 'delete_account' &&
    tokens_.length <= 1) {
    h.writeError(response, 'Invalid operation: ' + request.method +
    ' ' + request.url);
    return;
    }
    */

    // `tokens_` should contain `[ account, table ]` or
    // `[ account, 's', system_operation ]` now
    var tokens = tokenize(req.url);

    // Check that the system operations are valid
    if (isValidSystemOp(req.url)) {
      h.writeError(res, {
        message: "Invalid system operation. " + tokens[2]
      });
    }

    next();
  };

  //
  // Start the OData server
  // ---------------------

  exports.start = function() {
    var self = this;

    if (CONFIG.enableTooBusy) {
      setupTooBusy();
    }

    // setup the middleware
    // --------------------

    moduleSelf.server = new middleware();
    self.init(moduleSelf.server);

    // start http server
    // -----------------

    if (CONFIG.HTTPS_OPTIONS.USE_HTTPS) {

      log.log('Use HTTPS.');

      var httpsOptions = {
        key: fs.readFileSync(CONFIG.HTTPS_OPTIONS.KEY_FILE),
        cert: fs.readFileSync(CONFIG.HTTPS_OPTIONS.CERT_FILE)
      };

      moduleSelf.server.listen(CONFIG.ODATA.PORT, httpsOptions);

    } else {
      log.log('Use HTTP.');
      moduleSelf.server.listen(CONFIG.ODATA.PORT);
    }

    log.log("Server is listening on port " + CONFIG.ODATA.PORT);
  };

  //
  // Stop the OData server
  // ---------------------

  exports.stop = function() {
    moduleSelf.server.close();
  };

  //
  // Expose the buckets and odataserver classes to they can be used with express
  // ---------------------------------------------------------------------------
  //
  //```
  // var express = require('express');
  // var app = express();
  //
  // var odataserver = require('odataserver');
  // odataserver.init(app);
  //
  // var server = app.listen(3000, function () {
  //
  //   var host = server.address().address;
  //   var port = server.address().port;
  //
  //   console.log('Example app listening at http://%s:%s', host, port);
  //
  // });
  //```

  exports.init = function(mws) {
    var self = this;

    var odataServer = new odata.ODataServer();
    var bucketServer = new buckets.BucketHttpServer();

    mws.use(checkMethod);
    mws.use(allowCors);
    mws.use(logRequest);
    mws.use(matchHelp);
    mws.use(performChecks);
    mws.use(bucketServer.main.bind(bucketServer));
    mws.use(odataServer.main.bind(odataServer));
  };

  exports.buckets = buckets.BucketHttpServer;
  exports.rdbms = odata.ODataServer;

})(this);
