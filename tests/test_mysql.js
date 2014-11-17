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

var mysql = require('../src/mysql.js');
var rs = require('../src/mysql.js').mysqlRead;
var ws = require('../src/mysql.js').mysqlWriteStream;
var h = require('../src/helpers.js');

var CONFIG = require('../src/config.js');
var testEmail = 'test@gizur.com';
var testEmail2 = 'test2@gizur.com';

var accountId=h.email2accountId(testEmail);
var accountId2=h.email2accountId(testEmail2);


// Main
// =====

var delay = 1;

var credentials = {
  host: CONFIG.MYSQL.HOST,
};

var credentials2 = {
  host: CONFIG.MYSQL.HOST,
};


var adminCredentials = {
  host: CONFIG.MYSQL.HOST,
  user: CONFIG.MYSQL.ADMIN_USER,
  password: CONFIG.MYSQL.ADMIN_PASSWORD
};


// This streams save everything written to it
var bucket = new h.arrayBucketStream();


// create new user
setTimeout(function() {
  var mysqlAdmin = new mysql.mysqlAdmin(adminCredentials, accountId);
  h.log.log('Create new user...');
  mysqlAdmin.new();
  mysqlAdmin.pipe(bucket);

  // save the credentials to use below
  credentials.database = mysqlAdmin.accountId;
  credentials.user = mysqlAdmin.accountId;


  var mysqlAdmin2 = new mysql.mysqlAdmin(adminCredentials, accountId2);
  h.log.log('Create new user #2...');
  mysqlAdmin2.new();
  mysqlAdmin2.pipe(bucket);

  // save the credentials to use below
  credentials2.database = mysqlAdmin2.accountId;
  credentials2.user = mysqlAdmin2.accountId;

}.bind(this), (delay++)*1000);

// set passwords
setTimeout(function() {
  var mysqlAdmin = new mysql.mysqlAdmin(adminCredentials, accountId);
  mysqlAdmin.setPassword();
  mysqlAdmin.pipe(bucket);

  // save the password to use below
  credentials.password = mysqlAdmin.password;
  h.log.log('Password set to: '+credentials.password);

  var mysqlAdmin2 = new mysql.mysqlAdmin(adminCredentials, accountId2);
  mysqlAdmin2.setPassword();
  mysqlAdmin2.pipe(bucket);

  // save the password to use below
  credentials2.password = mysqlAdmin2.password;
  h.log.log('Password #2 set to: '+credentials2.password);

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

  var create = new mysql.mysqlCreate(credentials, tableDef);
  create.pipe(process.stdout);
}, (delay++)*1000);

// Grant privs to user #2
setTimeout(function() {
  h.log.debug('Grant privs to table1 to user #2');
  var mysqlAdmin = new mysql.mysqlAdmin(credentials, accountId);
  mysqlAdmin.grant('table1', accountId2);
  mysqlAdmin.pipe(bucket);
}.bind(this), (delay++)*1000);

// insert into table
setTimeout(function() {
  var mysqlStream = new ws(credentials, accountId, 'table1', process.stdout);

  // create stream that writes json into mysql
  var jsonStream = new require('stream');
  jsonStream.pipe = function(dest) {
    dest.write(JSON.stringify({
      col1: 11,
      col2: '11'
    }));
  };

  jsonStream.pipe(mysqlStream);

  // insert into a table that isn't owned by user #2
  var mysqlStream2 = new ws(credentials2, accountId, 'table1', process.stdout);

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

  var mysqlRead = new rs(credentials, 'select * from table1');
  mysqlRead.pipe(bucket);
}.bind(this), (delay++)*1000);

// wait four seconds and write results
setTimeout(function() {
  var decoder = new StringDecoder('utf8');
  h.log.log('BUCKET CONTENTS after insert (decoded):' + decoder.write(bucket.get()));
}.bind(this), (delay++)*1000);

// delete from table
setTimeout(function() {
  var create = new mysql.mysqlDelete(credentials, accountId, 'table1');
  create.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// read table
setTimeout(function() {
  var mysqlRead = new rs(credentials, 'select * from table1');
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
  var drop = new mysql.mysqlDrop(credentials, 'table1');
  drop.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// drop the new user
setTimeout(function() {
  var mysqlAdmin = new mysql.mysqlAdmin(adminCredentials, accountId);
  h.log.log('Drop the new user...');
  mysqlAdmin.delete();
  mysqlAdmin.pipe(bucket);

  var mysqlAdmin2 = new mysql.mysqlAdmin(adminCredentials, accountId2);
  h.log.log('Drop the new user #2...');
  mysqlAdmin2.delete();
  mysqlAdmin2.pipe(bucket);

}.bind(this), (delay++)*1000);
