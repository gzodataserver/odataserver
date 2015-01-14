// main.js
//------------------------------
//
// 2014-12-06, Jonas Colmsjö
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
// Install with: `npm install`
// Run with: `npm start`


var http = require("http");
var url = require('url');
var test = require('tape');

var CONFIG = require('./config.js');
var odata = require('./odataserver.js');
var h = require('./helpers.js');

var log = new h.log0(CONFIG.mainLoggerOptions);

// NOTE - Should also add leveldb
var rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);

var server;



//
// Start the OData server
// ---------------------

exports.start = function() {

  // handle request with odata server
  var odataServer = new odata.ODataServer();


  // start http server
  // -----------------

  server = http.createServer(function(request, response) {

    var parsedURL = url.parse(request.url, true, false);
    var a = parsedURL.pathname.split("/");

    var str = "Processing request: " +
      JSON.stringify(request.method) + " - " +
      JSON.stringify(request.url) + " - " +
      JSON.stringify(request.headers);

    // log and fire dtrace probe
    log.log(str);
    h.fireProbe(str);

    // Handle the request
    odataServer.main(request, response, rdbms);


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
