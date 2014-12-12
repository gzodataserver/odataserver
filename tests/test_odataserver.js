// test_odatauri2sql.js
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
// Run like this: `./node_modules/.bin/nodeunit test_odataserver.js`
// Install dependencies first: `npm install`



/*
 * IN PROGRESS - THE ODATASERVER IS NOT COMPLETED, CHECK END OF odataaserver.js
 *
 */

var http = require("http");
var test = require('tape');

var mysql = require('./../src/mysql.js');
var CONFIG = require('../src/config.js');
var odata = require('./../src/odataserver.js');
var o2s = require('../src/odataserver.js');

var h = require('../src/helpers.js');
var log = new h.log0(CONFIG.testLoggerOptions);

var defaultPort = CONFIG.ODATA.PORT;


var ic, c, server;

//
// Some Uris to test with
// ---------------------

test('setUp', function(test) {

  // IMPORTANT: UPDATE THIS IP ADDRESS BEFORE RUNNING THE TESTS

  // Incorrect URLs
  ic = [];
  ic.push('http://localhost/xyz/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2');
  ic.push('http://localhost/schema/table(2)');

  // Correct URLs
  c = [];
  c.push('http://localhost/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10');
  c.push('http://localhost/schema/table');
  c.push('http://localhost/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2');
  c.push('http://localhost/schema/table?$orderby=col2');


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

  server.listen(defaultPort);

  log.log("Server is listening on port " + defaultPort);

  // setup finished
  test.end();
});



//
// Test GET/SELECT Uris
// ---------------------

test('testing odatauri2sql.ODataUri2Sql GET', function(test) {
  var uriParser = new o2s.ODataUri2Sql();

  test.plan(6);

  var expected = [];
  expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where co1 = \\"help\\" order by col2 limit 10,100"}');
  expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select * from schema.table"}');
  expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where Price + 5 > 10 order by col2"}');
  expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select * from schema.table order by col2"}');


  for (var i = 0; i < c.length; i++) {
    var o = uriParser.parseUri(c[i], 'GET');

    test.deepEqual(o,
      JSON.parse(expected[i]),
      c[i]);
  }

  for (i = 0; i < ic.length; i++) {
    test.throws(function() {
      uriParser.parseUri(ic[i]);
    });
  }

  test.end();

});


//
// Test POST/INSERT Uris
// ---------------------

test('testing odatauri2sql.ODataUri2Sql POST', function(test) {
  var uriParser = new o2s.ODataUri2Sql();

  test.plan(5);

  for (var i = 0; i < ic.length; i++) {
    test.throws(function() {
      uriParser.parseUri(ic[i], 'POST');
    });
  }

  for (i = 0; i < c.length; i++) {
    // URL #2 is ok for POST
    if(i !== 1) {
      test.throws(function() {
        uriParser.parseUri(c[i], 'POST');
      });
    }
  }

  test.end();

});

//
// Test the etag function
// -----------------------


test('testing etag', function(test) {
  var uriParser = new o2s.ODataUri2Sql();

  var expected = {
    "key1": "val1",
    "key2": "val2",
    "@odata.etag": "f2a47ef58c1564593e6313924c79f6d4"
  };
  var o = uriParser.addEtag({
    'key1': 'val1',
    'key2': 'val2'
  });
  test.deepEqual(o, expected, 'Check ETAG');
  test.end();
});


//
// Test the etag function
// -----------------------

test('testing simple GET', function(test) {

  // path and method is set in each test
  var options = {
    hostname: CONFIG.ODATA.HOST,
    port: defaultPort,
    headers: {
      user: 'wp',
      password: 'wp'
    },
    method: 'GET',
    path: '/wp/wp_links?$orderby=link_id'
  };


  var expected = {
    value: [{
      '@odata.etag': 'c7e19e5018a42885e0a84925e3d2aec8',
      link_description: '',
      link_id: 1,
      link_image: '',
      link_name: 'Documentation',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://codex.wordpress.org/',
      link_visible: 'Y'
    }, {
      '@odata.etag': 'ed72dc5274fc377332892108ea6287c5',
      link_description: '',
      link_id: 2,
      link_image: '',
      link_name: 'WordPress Blog',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: 'http://wordpress.org/news/feed/',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://wordpress.org/news/',
      link_visible: 'Y'
    }, {
      '@odata.etag': '9479d4b1e98bd01b848d9ed0776aaf0e',
      link_description: '',
      link_id: 3,
      link_image: '',
      link_name: 'Support Forums',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://wordpress.org/support/',
      link_visible: 'Y'
    }, {
      '@odata.etag': 'a6d05cfb42f2b98a4f1e493251e9d309',
      link_description: '',
      link_id: 4,
      link_image: '',
      link_name: 'Plugins',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://wordpress.org/extend/plugins/',
      link_visible: 'Y'
    }, {
      '@odata.etag': '83cc01e1cbd1810281a9d3d41e86e8ea',
      link_description: '',
      link_id: 5,
      link_image: '',
      link_name: 'Themes',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://wordpress.org/extend/themes/',
      link_visible: 'Y'
    }, {
      '@odata.etag': 'b0c2f191c14cf21531a0a4724edb5d8d',
      link_description: '',
      link_id: 6,
      link_image: '',
      link_name: 'Feedback',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://wordpress.org/support/forum/requests-and-feedback',
      link_visible: 'Y'
    }, {
      '@odata.etag': '535377d732cabe4c215c196eda6e9d06',
      link_description: '',
      link_id: 7,
      link_image: '',
      link_name: 'WordPress Planet',
      link_notes: '',
      link_owner: 1,
      link_rating: 0,
      link_rel: '',
      link_rss: '',
      link_target: '',
      link_updated: '0000-00-00 00:00:00',
      link_url: 'http://planet.wordpress.org/',
      link_visible: 'Y'
    }]
  };


  test.plan(1);

  var data = '';

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      var jsonData = h.jsonParse(data);

      test.deepEqual(jsonData, expected, 'Check JSON from GET ');
      test.end();
    });
  });

  req.on('error', function(e) {
    log.log('problem with request: ' + e.message);
  });

  req.end();


});


test('tearDown', function(test) {
  var self = this;
  server.close();
  test.end();
});
