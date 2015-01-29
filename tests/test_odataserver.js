// test_odatauri2sql.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Test for the odata server
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

var http = require('http');
var test = require('tape');
var u = require('underscore');

var mysql = require('./../src/mysql.js');
var CONFIG = require('../src/config.js');
var odata = require('./../src/odataserver.js');
var o2s = require('../src/odataserver.js');

var h = require('../src/helpers.js');
var log = new h.log0(CONFIG.testLoggerOptions);

var defaultPort = CONFIG.ODATA.PORT;

var ic, c, server;

test('Test new parser ', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(17);

  test.deepEqual(
    parse('GET', '/help'), {
      "queryType": "help"
    },
    'GET /help');

  // Not what you'd expect but correct, authentication will of course fail
  test.deepEqual(
    parse('GET', '/help2'), {
      queryType: 'service_def',
      schema: 'help2'
    }, 'GET /help2');

  test.deepEqual(
    parse('POST', '/create_account'), {
      "queryType": "create_account"
    }, 'POST /create_account');

  test.deepEqual(
    parse('GET', '/account1'), {
      "queryType": "service_def",
      "schema": "account1"
    }, 'GET /account1');

  test.deepEqual(
    parse('GET', '/account2/table2'), {
      "queryType": "select",
      "schema": "account2",
      "table": "table2",
      "sql": "select * from account2.table2"
    }, 'GET /account2/table2');

  test.deepEqual(
    parse('POST', '/account3/table3'), {
      "queryType": "insert",
      "schema": "account3",
      "table": "table3"
    }, 'POST /account3/table3');

  test.deepEqual(
    parse('PUT', '/account4/table4'), {
      "queryType": "update",
      "schema": "account4",
      "table": "table4"
    }, 'PUT /account4/table4');

  test.deepEqual(
    parse('DELETE', '/account5/table5'), {
      "queryType": "delete",
      "schema": "account5",
      "table": "table5"
    }, 'DELETE /account5/table5');

  test.deepEqual(
    parse('POST', '/account1/s/create_bucket'), {
      "queryType": "create_bucket",
      "schema": "account1"
    }, 'POST /account1/s/create_bucket');

  test.deepEqual(
    parse('POST', '/account1/s/drop_bucket'), {
      "queryType": "drop_bucket",
      "schema": "account1"
    }, 'POST /account1/s/drop_bucket');

  test.deepEqual(
    parse('POST', '/account1/s/create_table'), {
      "queryType": "create_table",
      "schema": "account1"
    }, 'POST /account1/s/create_table');

  test.deepEqual(
    parse('POST', '/account1/s/drop_table'), {
      "queryType": "drop_table",
      "schema": "account1"
    }, 'POST /account1/s/drop_table');

  test.deepEqual(
    parse('POST', '/account1/s/reset_password'), {
      "queryType": "reset_password",
      "schema": "account1"
    }, 'POST /account1/s/reset_password');

  test.deepEqual(
    parse('POST', '/account1/s/reset_password/xxx-xxx-xxx-xxx'), {
      "queryType": "reset_password",
      "schema": "account1",
      "resetToken": "xxx-xxx-xxx-xxx"
    }, '/account1/s/reset_password/xxx-xxx-xxx-xxx');


  test.deepEqual(
    parse('GET', '/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select col1,col2 from schema.table where co1 = \"help\" order by col2 limit 10,100"
    },
    '/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10');

  test.ok(
    parse('GET', '/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select col1,col2 from schema.table where Price + 5 > 10 order by col2"
    },
    '/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2');


  test.ok(
    parse('GET', '/schema/table?$orderby=col2'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select * from schema.table order by col2"
    },
    '/schema/table?$orderby=col2');


  test.end();

});

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
  expected.push('{"queryType":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where co1 = \\"help\\" order by col2 limit 10,100"}');
  expected.push('{"queryType":"select","schema":"schema","table":"table","sql":"select * from schema.table"}');
  expected.push('{"queryType":"select","schema":"schema","table":"table","sql":"select col1,col2 from schema.table where Price + 5 > 10 order by col2"}');
  expected.push('{"queryType":"select","schema":"schema","table":"table","sql":"select * from schema.table order by col2"}');

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
    if (i !== 1) {
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



test('tearDown', function(test) {
  var self = this;
  server.close();
  test.end();
});
