// test_mysql.js
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

//var Transform = require('stream').Transform;
//var Writable = require('stream').Writable;
var StringDecoder = require('string_decoder').StringDecoder;

var mssql = require('../src/mssql.js');
var h = require('../src/helpers.js');

var CONFIG = require('../src/config.js');
var testEmail = 'test@gizur.com';
var testEmail2 = 'test2@gizur.com';

var accountId=h.email2accountId(testEmail);
var accountId2=h.email2accountId(testEmail2);


// Main
// =====

var delay = 1;

var adminCredentials = {
  host: CONFIG.MSSQL.HOST,
  user: CONFIG.MSSQL.ADMIN_USER,
  password: CONFIG.MSSQL.ADMIN_PASSWORD
};

// This streams save everything written to it
var bucket = new h.arrayBucketStream();

// select from table
setTimeout(function() {
  h.log.debug('Read values of the mssql stream:');

  var mssqlRead = new mssql.mssqlRead(adminCredentials, 'select * from ar');
  mssqlRead.pipe(bucket);
}.bind(this), (delay++)*1000);

// check what was read this time
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS delete (decoded):' + decoder.write(bucket.get()));
}.bind(this), (delay++)*1000);
