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

  var http = require('http');
  var url = require('url');
  var test = require('tape');
  var fs = require('fs');

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
  }

  //
  // Start the OData server
  // ---------------------

  exports.start = function() {

    // handle request with odata server
    var odataServer = new odata.ODataServer();

    // start http server
    // -----------------

    server = http.createServer(function(request, response) {

      // Only GET, POST, PUT and DELETE supported
      if (!(request.method == 'GET' ||
          request.method == 'POST' ||
          request.method == 'DELETE')) {

        h.writeError(response, request.method + ' not supported.');
      }

      var parsedURL = url.parse(request.url, true, false);
      var a = parsedURL.pathname.split("/");
      var operation = a[2];

      var str = "Processing request: " +
        JSON.stringify(request.method) + " - " +
        JSON.stringify(request.url) + " - " +
        JSON.stringify(request.headers);

      // log and fire dtrace probe
      log.log(str);
      h.fireProbe(str);

      // Show the help
      if (a[1] === CONFIG.ODATA.HELP_PATH) {
        showHelp(request, response);
        return;
      }

      // Check that the url has table/bucket or system operation
      if (a.length <= 2) {
        h.writeError(response, "Invalid operation: " + request.url);
        return;
      }

      // Check that the system operations are valid
      if (a[1] === CONFIG.ODATA.SYS_PATH &&
        !odata.isAdminOp(operation) &&
        !buckets.isAdminOp(operation)) {
        h.writeError(response, "Invalid system operation. " + operation);
        return;
      }

      // Check if this is an operatoion on a bucket by looking for the b_
      // prefix
      if (buckets.isAdminOp(operation) ||
        operation.substr(0, CONFIG.ODATA.BUCKET_PREFIX.length) ===
        CONFIG.ODATA.BUCKET_PREFIX) {
        log.debug("Bucket operation: " + operation);
        var bucketServer = new buckets.BucketHttpServer();
        bucketServer.main(request, response);
        return;
      }

/*
      // Parse the Uri
      var uriParser = new odata.ODataUri2Sql();
      var odataRequest = uriParser.parseUri(request.url, request.method);

      // Check that the MySQL credentials have been supplied, not required when
      // creating a new account or resetting password
      if (odataRequest.queryType != 'create_account' &&
        odataRequest.queryType != 'reset_password' &&
        !h.checkCredentials(request, response)) {

        h.writeError(response,
          "Invalid credentials, user or password missing. " +
          "URL: " + request.url +
          ", headers: " + JSON.stringify(request.headers) + " TYPE:" +
          odataRequest.queryType);

        return;
      }
*/
      // Handle the request
      odataServer.main(request, response);

      // NOTE: The response object should not be closed explicitly here

    });

    server.listen(CONFIG.ODATA.PORT);

    log.log("Server is listening on port " + CONFIG.ODATA.PORT);

  };

  //
  // Stop the OData server
  // ---------------------

  exports.stop = function() {
    server.close();
  };

})(this);
