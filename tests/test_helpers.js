// test_helpers.js
//------------------------------
//
// 2014-12-03, Jonas Colmsjö
//------------------------------
//
// Test for the helper functions
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

var test = require('tape');

var config = require('../src/config.js');
global.global.CONFIG = new config({});


var h = require('../src/helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONSTANTS = require('../src/constants.js');
var log = new h.log0(CONSTANTS.testLoggerOptions);

//
// Some Uris to test with
// ---------------------

test('setUp', function(test) {
  // setup here

  // setup finished
  test.end();
});

//
// Some config and defaults
// ---------------------

test('test config and defaults', function(test) {
  var conf = new config({
    ODATA: {
      HOST: 'myhost'
    }
  });

  test.ok(conf.ODATA.HOST === 'myhost', 'Check that ODATA.HOST has been set');

  test.end();
});

//
// Test the arrayBucketStream
// -----------------------

test('testing arrayBucketStream', function(test) {
  test.plan(1);

  var bucket = new h.arrayBucketStream();

  var json = {
    col1: 11,
    col2: '11'
  };

  // create stream that writes json into bucket
  var jsonStream = new require('stream');
  jsonStream.pipe = function(dest) {
    dest.write(JSON.stringify(json));
  };

  jsonStream.pipe(bucket);
  log.debug('JSON in bucket using decoder: ' + decoder.write(bucket.get()));

  var json2 = h.jsonParse(bucket.get());
  log.debug('JSON in bucket using jsonParse col1:' + json2.col1 + ', col2:' +
    json2.col2);

  test.deepEqual(json, json2,
    'json in bucket should equal the source json');

  test.end();
});

//
// Test logging
// -------------

test('testing logging functions', function(test) {

  var o = {
    one: 1,
    two: 'two',
    pi: 3.1415
  };
  var f = function(one, two, pi) {
    var one = 1,
      two = 'two',
      pi = 3.1415;
  }

  log.debug(o);
  log.debug(f);

  test.end();

});
