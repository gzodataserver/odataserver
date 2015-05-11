// test_odataserver.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//------------------------------
//
// Test for the odata server
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

var http = require('http');
var test = require('tape');
var u = require('underscore');

var config = require('../src/config.js');
global.global.CONFIG = new config({});

var mysql = require('./../src/mysql.js');

var CONSTANTS = require('../src/constants.js');
var odata = require('./../src/odataserver.js');
var o2s = require('../src/odataserver.js');

var h = require('../src/helpers.js');
var log = new h.log0(CONSTANTS.testLoggerOptions);

var defaultPort = global.CONFIG.ODATA.PORT;

var ic, c, server;

test('Test parser for /operation', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(4);

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

  test.end();

});

test('Test parser for /schema/table operations', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(4);

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

  test.end();

});

test('Test parser for /account/s/operation ', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(6);

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
    parse('GET', '/account1/s/reset_password/xxx-xxx-xxx-xxx'), {
      "queryType": "reset_password",
      "schema": "account1",
      "resetToken": "xxx-xxx-xxx-xxx"
    }, '/account1/s/reset_password/xxx-xxx-xxx-xxx');


  test.end();

});


test('Test parser for /schema/table?select... operation', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(3);

  test.deepEqual(
    parse('GET', '/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select col1,col2 from schema.table where co1 = \"help\" order by col2 limit 10,100"
    },
    '/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10');

  test.deepEqual(
    parse('GET', '/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select col1,col2 from schema.table where Price + 5 > 10 order by col2"
    },
    '/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2');

  test.deepEqual(
    parse('GET', '/schema/table?$orderby=col2'), {
      "queryType": "select",
      "schema": "schema",
      "table": "table",
      "sql": "select * from schema.table order by col2"
    },
    '/schema/table?$orderby=col2');


  test.end();

});

test('Test parser for grant and revoke operations ', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(2);

  test.deepEqual(
    parse('POST', '/account1/s/grant'), {
      queryType: 'grant',
      schema: 'account1'
    }, 'POST /account1/s/grant');

  test.deepEqual(
    parse('POST', '/account1/s/revoke'), {
      queryType: 'revoke',
      schema: 'account1'
    }, 'POST /account1/s/revoke');

  test.end();

});

test('Test parser for metadata', function(test) {

  var parser = new o2s.ODataUri2Sql();
  var parse = parser.parseUri2;

  test.plan(1);

  test.deepEqual(
    parse('GET', '/account1/table1/$metadata'), {
      queryType: 'metadata',
      schema: 'account1',
      table: 'table1'
    }, 'GET /account1/table1/$metadata');


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
