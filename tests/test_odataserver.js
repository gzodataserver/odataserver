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


/*
 * IN PROGRESS - THE ODATASERVER IS NOT COMPLETED, CHECK END OF odataaserver.js
 *
 */

var defaultPort = 8080;
var mysql = require('./../src/mysql.js');
var CONFIG = require('../src/config.js');

var h = require('../src/helpers.js');
var log = new h.log0({debug: true, filename: __filename});

exports['test.odatauri2sql'] = {

  //
  // Some Uris to test with
  // ---------------------

  setUp: function(done) {
    var self=this;

    // IMPORTANT: UPDATE THIS IP ADDRESS BEFORE RUNNING THE TESTS

    self.o2s = require('../src/odataserver.js');
    self.h = require('../src/helpers.js');
    self.h.debug = true;

    // Incorrect URLs
    self.ic = [];
    self.ic.push('http://localhost/xyz/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2');
    self.ic.push('http://localhost/schema/table(2)');

    // Correct URLs
    self.c = [];
    self.c.push('http://localhost/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10');
    self.c.push('http://localhost/schema/table');
    self.c.push('http://localhost/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2');
    self.c.push('http://localhost/schema/table?$orderby=col2');


    // start http server
    // -----------------

    var http = require("http");
    var h = require('../src/helpers.js');
    var mysql = require('./../src/mysql.js');
    var odata = require('./../src/odataserver.js');

    self.server = http.createServer(function(request, response) {

      log.log("Processing request: " +
        JSON.stringify(request.method) + " - " +
        JSON.stringify(request.url) + " - " +
        JSON.stringify(request.headers));

      // handle request with odata server
      var odataServer = new odata.ODataServer();
      odataServer.main(request, response, mysql);

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

  //
  // Test GET/SELECT Uris
  // ---------------------

  'testing odatauri2sql.ODataUri2Sql GET': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    test.expect(6);

    var expected = [];
    expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where co1 = \\"help\\" order by col2 limit 10,100"}');
    expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select * from schema.table"}');
    expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where Price + 5 > 10 order by col2"}');
    expected.push('{"query_type":"select","schema":"schema","table":"table","sql":"select * from schema.table order by col2"}');


    for (var i = 0; i < this.c.length; i++) {
      var o = uriParser.parseUri(this.c[i], 'GET');

      test.deepEqual(o,
        JSON.parse(expected[i]),
        this.c[i]);

    }

    for (i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.ic[i]);
      });
    }

    test.done();

  },


  //
  // Test POST/INSERT Uris
  // ---------------------

  'testing odatauri2sql.ODataUri2Sql POST': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    test.expect(6);

    for (var i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.ic[i], 'POST');
      });
    }

    for (i = 0; i < this.c.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.c[i], 'POST');
      });
    }

    test.done();

  },

  //
  // Test the etag function
  // -----------------------


  'testing etag': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    var expected = {
      "key1": "val1",
      "key2": "val2",
      "@odata.etag": "f2a47ef58c1564593e6313924c79f6d4"
    };
    var o = uriParser.addEtag({
      'key1': 'val1',
      'key2': 'val2'
    });
    test.deepEqual(o, expected, 'ETAG not what we expected');
    test.done();
  },


  //
  // Test the etag function
  // -----------------------

  'testing simple GET': function(test) {
    var self=this;
    var http = require('http');

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
        link_id: 1,
        link_url: "http://codex.wordpress.org/",
        link_name: "Documentation",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "75a79d6b59e17fb4c11a04c4b9187644"
      }, {
        link_id: 2,
        link_url: "http://wordpress.org/news/",
        link_name: "WordPress Blog",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "http://wordpress.org/news/feed/",
        "@odata.etag": "6da53c8dffc1e367d0f8d16111f77c27"
      }, {
        link_id: 3,
        link_url: "http://wordpress.org/support/",
        link_name: "Support Forums",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "6b6e932a73230d4cd6e1a4c357d31e22"
      }, {
        link_id: 4,
        link_url: "http://wordpress.org/extend/plugins/",
        link_name: "Plugins",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "d2bb724531ec90db4e930a2b2d93b50d"
      }, {
        link_id: 5,
        link_url: "http://wordpress.org/extend/themes/",
        link_name: "Themes",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "9f2eb495901f729108964b217d251faa"
      }, {
        link_id: 6,
        link_url: "http://wordpress.org/support/forum/requests-and-feedback",
        link_name: "Feedback",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "b89f78b689f88d835a9ebd2d98f0525d"
      }, {
        link_id: 7,
        link_url: "http://planet.wordpress.org/",
        link_name: "WordPress Planet",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "422422e0f45f69272825fa878a12816c"
      }]
    };


    test.expect(1);

    var data = '';
    log.debug('in testing simple GET: '+JSON.stringify(options));

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');

      log.debug('IN HTTP.REQUEST');

      res.on('data', function(chunk) {
        log.debug('IN HTTP.REQUEST DATA');
        data += chunk;
      });

      res.on('end', function() {
        log.debug('IN HTTP.REQUEST END. JSON: '+data);
        var jsonData = h.jsonParse(data);

        test.deepEqual(expected, jsonData, 'GET did not return what was expected');
        test.done();
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.end();


  }

};
