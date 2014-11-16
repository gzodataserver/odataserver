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

var mysql_streams = require('../src/mysql_streams.js');

var rs = require('../src/mysql_streams.js').mysqlRead;
var ws = require('../src/mysql_streams.js').mysqlWriteStream;
var h = require('../src/helpers.js');
var Transform = require('stream').Transform;
var Writable = require('stream').Writable;
var StringDecoder = require('string_decoder').StringDecoder;



// Main
// =====

var credentials = {
  host: 'localhost',
  database: 'wp',
  user: 'wp',
  password: 'wp'
};


//
// Stream that aggregates objects that are written into array
// ---------------------------------------------------------

var arrayBucketStream = function(options) {
  // if new wasn't used, do it for them
  if (!(this instanceof arrayBucketStream))
    return new arrayBucketStream(options);

  // call stream.Writeable constructor
  Writable.call(this, options);

  this.data = [];
};

// inherit stream.Writeable
arrayBucketStream.prototype = Object.create(Writable.prototype);

// override the write function
arrayBucketStream.prototype._write = function(chunk, encoding, done) {
  this.data.push(chunk);
  done();
};

arrayBucketStream.prototype.get = function() {
  return this.data;
};

arrayBucketStream.prototype.empty = function() {
  this.data = [];
};


//
// Main
// ---------------------------------------------------------

// drop table
var drop = new mysql_streams.mysqlDrop(credentials, 'table1');
drop.pipe(process.stdout);

// Wait a second and create table
setTimeout(function() {
  var tableDef = {
    table_name: 'table1',
    columns: [
      'col1 int',
      'col2 varchar(255)',
    ]
  };

  var create = new mysql_streams.mysqlCreate(credentials, tableDef);
  create.pipe(process.stdout);
}, 1000);

// wait two seconds and insert into table
setTimeout(function() {
  var mysqlStream = new ws(credentials, 'table1', process.stdout);

  // create stream that writes json into mysql
  var jsonStream = new require('stream');
  jsonStream.pipe = function(dest) {
    dest.write(JSON.stringify({
      col1: 11,
      col2: '11'
    }));
  };

  jsonStream.pipe(mysqlStream);
}.bind(this), 2000);

// This streams save everything written to it
var bucket = new arrayBucketStream();

// wait three seconds and select from tabele
setTimeout(function() {
  h.log.debug('Read values of the mysql stream:');

  var mysqlRead = new rs(credentials, 'select * from table1');
  mysqlRead.pipe(bucket);
}.bind(this), 3000);

// wait four seconds and write results
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS after insert (decoded):' + decoder.write(bucket.get()));
}.bind(this), 4000);

// wait five seconds and delete from table
setTimeout(function() {
  var create = new mysql_streams.mysqlDelete(credentials, 'table1');
  create.pipe(process.stdout);
}.bind(this), 5000);

// wait six secods and read table
setTimeout(function() {
  var mysqlRead = new rs(credentials, 'select * from table1');
  bucket.empty();
  mysqlRead.pipe(bucket);
}.bind(this), 6000);

// wait seven secods and check what was read this time
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS delete (decoded):' + decoder.write(bucket.get()));
}.bind(this), 7000);
