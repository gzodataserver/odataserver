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
var testEmail = 'test@gizur.com';
var testEmail2 = 'test2@gizur.com';

var accountId=h.email2accountId(testEmail);
var accountId2=h.email2accountId(testEmail2);


// Main
// =====

var delay = 1;

var credentials = {
};

var credentials2 = {
};

var adminCredentials = {
  user: CONFIG.MYSQL.ADMIN_USER,
  password: CONFIG.MYSQL.ADMIN_PASSWORD
};

var bucket, bucket2;


console.log('IMPORTANT!!! Make sure that the ADMIN_USER and ADMIN_PASSWORD environment variables are set.');

// create new user
setTimeout(function() {
  // This streams save everything written to it
  bucket = new h.arrayBucketStream();

  var options = {
    credentials: adminCredentials,
    accountId: accountId
  };

  //var mysqlAdmin = new mysql.sqlAdmin(adminCredentials, accountId);
  var mysqlAdmin = new mysql.sqlAdmin(options);
  h.log.log('Create new user...');
  mysqlAdmin.new();
  mysqlAdmin.pipe(bucket);

  // save the credentials to use below
  credentials.database = mysqlAdmin.accountId;
  credentials.user = mysqlAdmin.accountId;


  // This streams save everything written to it
  bucket2 = new h.arrayBucketStream();

  var options2 = {
    credentials: adminCredentials,
    accountId: accountId2
  };

  //var mysqlAdmin2 = new mysql.sqlAdmin(adminCredentials, accountId2);
  var mysqlAdmin2 = new mysql.sqlAdmin(options2);
  h.log.log('Create new user #2...');
  mysqlAdmin2.new();
  mysqlAdmin2.pipe(bucket2);

  // save the credentials to use below
  credentials2.database = mysqlAdmin2.accountId;
  credentials2.user = mysqlAdmin2.accountId;

}.bind(this), (delay++)*1000);

// set passwords
setTimeout(function() {
  var options = {
    credentials: adminCredentials,
    accountId: accountId
  };

  //var mysqlAdmin = new mysql.sqlAdmin(adminCredentials, accountId);
  var mysqlAdmin = new mysql.sqlAdmin(options);
  mysqlAdmin.setPassword();
  mysqlAdmin.pipe(bucket);

  // save the password to use below
  credentials.password = mysqlAdmin.password;
  h.log.log('Password set to: '+credentials.password);

  var options2 = {
    credentials: adminCredentials,
    accountId: accountId2
  };

  //var mysqlAdmin2 = new mysql.sqlAdmin(adminCredentials, accountId2);
  var mysqlAdmin2 = new mysql.sqlAdmin(options2);
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

  bucket = new h.arrayBucketStream();

  var options = {
    credentials: credentials,
    tableDef: tableDef
  };

  //var create = new mysql.sqlCreate(credentials, tableDef);
  var create = new mysql.sqlCreate(options);
  create.pipe(bucket);
}, (delay++)*1000);

// Grant privs to user #2
setTimeout(function() {
  h.log.debug('Grant privs to table1 to user #2');

  var options = {
    credentials: credentials,
    accountId: accountId
  };

  //var mysqlAdmin = new mysql.sqlAdmin(credentials, accountId);
  var mysqlAdmin = new mysql.sqlAdmin(options);
  mysqlAdmin.grant('table1', accountId2);
  mysqlAdmin.pipe(bucket);
}.bind(this), (delay++)*1000);

// insert into table
setTimeout(function() {

  var options = {
    credentials: credentials,
    accountId: accountId,
    tableName: 'table1',
    resultStream: process.stdout,
    closeStream: false
  };

  //var mysqlStream = new mysql.sqlWriteStream(credentials, accountId, 'table1', process.stdout);
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

  var options2 = {
    credentials: credentials2,
    accountId: accountId,
    tableName: 'table1',
    resultStream: process.stdout,
    closeStream: false
  };

  // insert into a table that isn't owned by user #2
  //var mysqlStream2 = new mysql.sqlWriteStream(credentials2, accountId, 'table1', process.stdout);
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

  options = {
    credentials: credentials,
     sql: 'select * from table1',
  //   processRowFunc: ''
  };

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
  var options = {
    credentials: credentials,
    accountId: accountId,
    tableName: 'table1',
  };

  //var del = new mysql.sqlDelete(credentials, accountId, 'table1');
  var del = new mysql.sqlDelete(options);
  del.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// read table
setTimeout(function() {
  var options = {
    credentials: credentials,
    sql: 'select * from table1'
  };

  //var mysqlRead = new mysql.sqlRead(credentials, 'select * from table1');
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
  var options = {
    credentials: credentials,
    tableName: 'table1',
  };

  //var drop = new mysql.sqlDrop(credentials, 'table1');
  var drop = new mysql.sqlDrop(options);
  drop.pipe(process.stdout);
}.bind(this), (delay++)*1000);

// drop the new user
setTimeout(function() {
  var options = {
    credentials: adminCredentials,
    accountId: accountId,
  };

  //var mysqlAdmin = new mysql.sqlAdmin(adminCredentials, accountId);
  var mysqlAdmin = new mysql.sqlAdmin(options);
  h.log.log('Drop the new user...');
  mysqlAdmin.delete();
  mysqlAdmin.pipe(bucket);

  var options2 = {
    credentials: adminCredentials,
    accountId: accountId2,
  };

  //var mysqlAdmin2 = new mysql.sqlAdmin(adminCredentials, accountId2);
  var mysqlAdmin2 = new mysql.sqlAdmin(options);
  h.log.log('Drop the new user #2...');
  mysqlAdmin2.delete();
  mysqlAdmin2.pipe(bucket);

}.bind(this), (delay++)*1000);
