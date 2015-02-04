// test_helpers.js
//------------------------------
//
// 2014-12-03, Jonas Colmsjö
//
//------------------------------
//
// Test for the helper functions
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

var test = require('tape');

var h = require('../src/helpers.js');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var CONFIG = require('../config.js');
var log = new h.log0(CONFIG.testLoggerOptions);

//
// Some Uris to test with
// ---------------------

test('setUp', function(test) {
  // setup here

  // setup finished
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
