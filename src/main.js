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
var test = require('tape');

var CONFIG = require('./config.js');
var odata = require('./odataserver.js');
var h = require('./helpers.js');

var log = new h.log0(CONFIG.mainLoggerOptions);

// NOTE - Should also add leveldb
var mysql = require('./mysql.js');


//
// Start the OData server
// ---------------------

exports.start = function() {


  // start http server
  // -----------------

  server = http.createServer(function(request, response) {

    log.log("Processing request: " +
    JSON.stringify(request.method) + " - " +
    JSON.stringify(request.url) + " - " +
    JSON.stringify(request.headers));

    // handle request with odata server
    var odataServer = new odata.ODataServer();
    odataServer.main(request, response, mysql);

  });

  server.listen(CONFIG.ODATA.PORT);

  log.log("Server is listening on port " + CONFIG.ODATA.PORT);

};
