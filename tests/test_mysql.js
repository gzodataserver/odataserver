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

var StringDecoder = require('string_decoder').StringDecoder;

var mysql = require('../src/mysql.js');
var rs = require('../src/mysql.js').sqlRead;
var ws = require('../src/mysql.js').sqlWriteStream;
var h = require('../src/helpers.js');

var CONFIG = require('../src/config.js');


// Main
// =====





var delay = 1;

// First test user
var testEmail = 'test@gizur.com';
var accountId = h.email2accountId(testEmail);
var options = {
  credentials: {
    user: accountId,
    database: accountId
  },
  accountId: accountId
};

// second test user
var testEmail2 = 'test2@gizur.com';
var accountId2 = h.email2accountId(testEmail2);
var options2 = {
  credentials: {
    user: accountId2,
    database: accountId2
  },
  accountId: accountId2
};

// user for admin operatioons (creating/deleting user etc.)
var adminOptions = {
  credentials: {
    user: CONFIG.MYSQL.ADMIN_USER,
    password: CONFIG.MYSQL.ADMIN_PASSWORD
  }
};

var bucket, bucket2;


console.log('IMPORTANT!!! Make sure that the ADMIN_USER and ADMIN_PASSWORD environment variables are set.');

// create new user
setTimeout(function() {
  // This streams save everything written to it
  bucket = new h.arrayBucketStream();
  var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
  h.log.log('Create new user...');
  mysqlAdmin.new(accountId);
  mysqlAdmin.pipe(bucket);

  // This streams save everything written to it
  bucket2 = new h.arrayBucketStream();
  var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
  h.log.log('Create new user #2...');
  mysqlAdmin2.new(accountId2);
  mysqlAdmin2.pipe(bucket2);

}.bind(this), (delay++)*1000);

// set passwords
setTimeout(function() {
  var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
  options.credentials.password = mysqlAdmin.resetPassword(accountId);
  mysqlAdmin.pipe(bucket);
  h.log.log('Password set to: '+options.credentials.password);

  var mysqlAdmin2 = new mysql.sqlAdmin(options2);
  options2.credentials.password = mysqlAdmin2.resetPassword(accountId2);
  mysqlAdmin2.pipe(bucket);
  options2.credentials.password = mysqlAdmin2.password;
  h.log.log('Password #2 set to: '+options2.credentials.password);

}.bind(this), (delay++)*1000);

// create table
setTimeout(function() {

  var tableDef = {
    table_name: 'table1',
    columns: [
      'col1 int',
      'col2 varchar(255)',
    ]
  };

  options.tableDef = tableDef;

  bucket = new h.arrayBucketStream();
  h.log.debug('create using options:'+JSON.stringify(options));
  var create = new mysql.sqlCreate(options);
  create.pipe(bucket);
}, (delay++)*1000);

// Grant privs to user #2
setTimeout(function() {
  h.log.debug('Grant privs to table1 to user #2');

  var mysqlAdmin = new mysql.sqlAdmin(options);
  mysqlAdmin.grant('table1', accountId2);
  mysqlAdmin.pipe(bucket);
}.bind(this), (delay++)*1000);

// insert into table
setTimeout(function() {

  options.tableName = 'table1';
  options.resultStream = process.stdout;
  options.closeStream = false;
  var mysqlStream = new mysql.sqlWriteStream(options);

  // create stream that writes json into mysql
  var jsonStream = new require('stream');
  jsonStream.pipe = function(dest) {
    dest.write(JSON.stringify({
      col1: 11,
      col2: '11'
    }));
  };

  jsonStream.pipe(mysqlStream);

  options2.tableName = 'table1';
  options2.resultStream = process.stdout;
  options2.closeStream = false;
  var mysqlStream2 = new mysql.sqlWriteStream(options2);

  // create stream that writes json into mysql
  var jsonStream2 = new require('stream');
  jsonStream2.pipe = function(dest) {
    dest.write(JSON.stringify({
      col1: 22,
      col2: '22'
    }));
  };

  jsonStream2.pipe(mysqlStream2);

}.bind(this), (delay++)*1000);

// select from tabele
setTimeout(function() {
  h.log.debug('Read values of the mysql stream:');
  options.sql = 'select * from table1';
  var mysqlRead = new mysql.sqlRead(options);
  mysqlRead.pipe(bucket);
}.bind(this), (delay++)*1000);

// wait four seconds and write results
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS after insert (decoded):' + decoder.write(bucket.get()));
}.bind(this), (delay++)*1000);

// delete from table
setTimeout(function() {
  options.tableName = 'table1';
  var del = new mysql.sqlDelete(options);
  del.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// read table
setTimeout(function() {
  options.sql = 'select * from table1';
  var mysqlRead = new mysql.sqlRead(options);
  bucket.empty();
  mysqlRead.pipe(bucket);
}.bind(this), (delay++)*1000);

// check what was read this time
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS delete (decoded):' + decoder.write(bucket.get()));
}.bind(this), (delay++)*1000);


// drop table
setTimeout(function() {
  options.tableName = 'table1';
  var drop = new mysql.sqlDrop(options);
  drop.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// drop the new user
setTimeout(function() {
  var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
  h.log.log('Drop the new user...');
  mysqlAdmin.delete(accountId);
  mysqlAdmin.pipe(bucket);

  var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
  h.log.log('Drop the new user #2...');
  mysqlAdmin2.delete(accountId2);
  mysqlAdmin2.pipe(bucket);

}.bind(this), (delay++)*1000);
