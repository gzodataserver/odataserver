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

var test = require('tape');

var StringDecoder = require('string_decoder').StringDecoder;

var mysql = require('../src/mysql.js');
var rs = require('../src/mysql.js').sqlRead;
var ws = require('../src/mysql.js').sqlWriteStream;
var h = require('../src/helpers.js');

var CONFIG = require('../config.js');
var log = new h.log0(CONFIG.testLoggerOptions);

var moduleSelf = this;

var resultStream = process.stderr;
var delay = 0;
  // milliseconds between async tests, 10 is the minimum that works on
  // my laptop
var intervall = 10;
var decoder = new StringDecoder('utf8');

// First test user
var testEmail = 'test@gizur.com';
var accountId = h.email2accountId(testEmail);
var options = {
  credentials: {
    user: accountId,
    database: accountId
  },
  closeStream: false
};

// second test user, access the database for user #1
var testEmail2 = 'test2@gizur.com';
var accountId2 = h.email2accountId(testEmail2);
var options2 = {
  credentials: {
    user: accountId2,
    database: accountId
  },
  closeStream: false
};

// user for admin operatioons (creating/deleting user etc.)
var adminOptions = {
  credentials: {
    user: CONFIG.RDBMS.ADMIN_USER,
    password: CONFIG.RDBMS.ADMIN_PASSWORD,
    database: CONFIG.RDBMS.DATABASE
  },
  closeStream: false
};

var bucket = new h.arrayBucketStream();
var bucket2 = new h.arrayBucketStream();

// Main
// =====

// Cleanup database in case previous tests failed
test('setUp', function(test) {
  var self = this;

  log.log('NOTE: Streams are used in these tests and process.stderr' +
          ' is as output stream.');

  // drop table
  setTimeout(function() {
    adminOptions.tableName = accountId + '.table1';
    var drop = new mysql.sqlDrop(adminOptions);
    drop.pipe(bucket);
  }.bind(this), (delay++) * intervall);

  // drop the users
  setTimeout(function() {
    var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop user #1...');
    mysqlAdmin.delete(accountId);
    mysqlAdmin.pipe(bucket);

    var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop user #2...');
    mysqlAdmin2.delete(accountId2);
    mysqlAdmin2.pipe(bucket);

    test.end();

  }.bind(this), (delay++) * intervall);

});
/*
test('testing_fetchAll', function(test) {

  test.plan(3);

  bucket = new h.arrayBucketStream();

  // 1. drop table
  setTimeout(function() {
    log.debug('drop table');
    adminOptions.tableName = 'mysql.table1';
    var drop = new mysql.sqlDrop(adminOptions);
    drop.pipe(bucket);
  }.bind(this), (delay++) * intervall);

  // 2. create table
  setTimeout(function() {
    log.debug('create table');

    var tableDef = {
      tableName: 'table1',
      columns: [
        'col1 int',
        'col2 varchar(255)',
      ]
    };

    adminOptions.tableDef = tableDef;
    var create = new mysql.sqlCreate(adminOptions);
    create.pipe(bucket);

    test.ok(true, 'create table');
  }, (delay++) * intervall);

  // 3. insert into table
  setTimeout(function() {
    log.debug('insert into table');
    adminOptions.tableName = 'table1';
    adminOptions.resultStream = bucket;
    adminOptions.closeStream = false;
    var mysqlStream = new mysql.sqlWriteStream(adminOptions);

    // create stream that writes json into mysql
    var jsonStream = new require('stream');
    jsonStream.pipe = function(dest) {
      dest.write(JSON.stringify({
        col1: 11,
        col2: '11'
      }));
    };

    jsonStream.pipe(mysqlStream);
    jsonStream.pipe(mysqlStream);

    log.debug('result from create and insert:' + bucket.getDecoded());

    test.ok(true, 'create and insert into table');
  }.bind(this), (delay++) * intervall);

  // 4. select from table
  setTimeout(function() {
    log.debug('select from table');
    adminOptions.sql = 'select * from mysql.table1';
    log.debug('111');
    var mysqlRead = new mysql.sqlRead(adminOptions);
    log.debug('111');
    bucket.empty();
    var data = [];
    mysqlRead.fetchAll(function(res) {
      data.push(res);
    });

    log.debug('data:' + data);

    test.ok(true, 'fetchAll tested');
    test.end();

  }.bind(this), (delay++) * intervall);

});*/

test('testing suite of functions, from create user to CRUD', function(test) {

  test.plan(19);

  var expected1 = [{
    "fieldCount": 0,
    "affectedRows": 0,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }, {
    "fieldCount": 0,
    "affectedRows": 0,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }, {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }, {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }, {
    "fieldCount": 0,
    "affectedRows": 2,
    "insertId": 0,
    "serverStatus": 34,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }, {
    "fieldCount": 0,
    "affectedRows": 0,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "",
    "protocol41": true,
    "changedRows": 0
  }];

  // 1. simple select
  setTimeout(function() {
    log.debug('select 1...');
    adminOptions.sql = 'select 1';
    var mysqlRead = new mysql.sqlRead(adminOptions);
    mysqlRead.pipe(bucket);

    test.ok(adminOptions.credentials.user !== undefined &&
      adminOptions.credentials.password !== undefined,
      'MySQL credentials not set');
  }.bind(this), (delay++) * intervall);

  // 2. create new user
  setTimeout(function() {
    //test.deepEqual(bucket.get() === expected1, 'Test section #1 did not return the expected result');

    // This streams save everything written to it
    var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    log.debug('Create new user...');
    mysqlAdmin.new(accountId);
    bucket.empty();
    mysqlAdmin.pipe(bucket);

    // This streams save everything written to it
    var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    log.debug('Create new user #2...');
    mysqlAdmin2.new(accountId2);
    bucket2.empty();
    mysqlAdmin2.pipe(bucket2);

    test.ok(true, 'create new user');
  }.bind(this), (delay++) * intervall);

  // 3. set passwords
  setTimeout(function() {
    var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    options.credentials.password = mysqlAdmin.resetPassword(accountId);
    mysqlAdmin.pipe(bucket);
    log.debug('Password set to: ' + options.credentials.password);

    var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    options2.credentials.password = mysqlAdmin2.resetPassword(accountId2);
    mysqlAdmin2.pipe(bucket);
    log.debug('Password #2 set to: ' + options2.credentials.password);

    test.ok(true, 'set passwords');
  }.bind(this), (delay++) * intervall);

  // 4. create table
  setTimeout(function() {

    var tableDef = {
      tableName: 'table1',
      columns: [
        'col1 int',
        'col2 varchar(255)',
      ]
    };

    options.tableDef = tableDef;

    bucket = new h.arrayBucketStream();
    log.debug('create using options:' + JSON.stringify(options));
    var create = new mysql.sqlCreate(options);
    create.pipe(bucket);

    test.ok(true, 'create table');
  }, (delay++) * intervall);

  // 5. Grant privs to user #2
  setTimeout(function() {
    log.debug('Grant privs to table1 to user #2');

    var mysqlAdmin = new mysql.sqlAdmin(options);
    mysqlAdmin.grant('table1', accountId2);
    mysqlAdmin.pipe(bucket);

    test.ok(true, 'Grant privs to user #2');
  }.bind(this), (delay++) * intervall);

  // 6. insert into table
  setTimeout(function() {

    options.tableName = 'table1';
    options.resultStream = resultStream;
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
    options2.resultStream = resultStream;
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

    test.ok(true, 'insert into table');
  }.bind(this), (delay++) * intervall);

  // 7. select from table
  setTimeout(function() {
    log.debug('Read values of the mysql stream:');
    options.sql = 'select * from table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    mysqlRead.pipe(bucket);
    test.ok(true, 'select from table');
  }.bind(this), (delay++) * intervall);

  // 9.Update table
  setTimeout(function() {
    options.tableName = 'table1';
    options.jsonData = {
      col2: '33'
    };
    options.where = 'col1=22';
    var del = new mysql.sqlUpdate(options);
    del.pipe(resultStream);

    test.ok(true, 'update table');
  }.bind(this), (delay++) * intervall);

  // 10. read table
  setTimeout(function() {
    options.sql = 'select * from table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    mysqlRead.pipe(bucket);

    test.ok(true, 'read table after update');
  }.bind(this), (delay++) * intervall);

  // 11. check what was read this time
  setTimeout(function() {
    log.debug('BUCKET CONTENTS update (decoded):' +
    decoder.write(bucket.get()));

    test.ok(true, 'check what was read this time');
  }.bind(this), (delay++) * intervall);

  // 8. wait four seconds and write results
  setTimeout(function() {
    var decoder = new StringDecoder('utf8');
    log.debug('BUCKET CONTENTS after insert (decoded):' +
              decoder.write(bucket.get()));
    test.ok(true, 'wait four seconds and write results');
  }.bind(this), (delay++) * intervall);

  // X. Revoke privs from user #2
  setTimeout(function() {
    log.debug('Revoke privs to table1 to user #2');

    var mysqlAdmin = new mysql.sqlAdmin(options);
    mysqlAdmin.revoke('table1', accountId2);
    mysqlAdmin.pipe(bucket);

    test.ok(true, 'Revoke privs from user #2');
  }.bind(this), (delay++) * intervall);

  // Y. select from table
  setTimeout(function() {
    log.debug('Read values of the mysql stream with user #2:');
    options.sql = 'select * from ' + accountId + '.table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    mysqlRead.pipe(bucket);
    test.ok(true, 'select from ' + accountId + '.table1');
  }.bind(this), (delay++) * intervall);

  // Z. wait four seconds and write results
  setTimeout(function() {
    var decoder = new StringDecoder('utf8');
    log.debug('BUCKET CONTENTS after insert (decoded):' +
              decoder.write(bucket.get()));
    test.ok(true, 'wait four seconds and write results');
  }.bind(this), (delay++) * intervall);

  // 9. delete from table
  setTimeout(function() {
    options.tableName = 'table1';
    var del = new mysql.sqlDelete(options);
    del.pipe(resultStream);

    test.ok(true, 'delete from table');
  }.bind(this), (delay++) * intervall);

  // 10. read table
  setTimeout(function() {
    options.sql = 'select * from table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    mysqlRead.pipe(bucket);

    test.ok(true, 'read table');
  }.bind(this), (delay++) * intervall);

  // 11. check what was read this time
  setTimeout(function() {
    log.debug('BUCKET CONTENTS delete (decoded):' +
              decoder.write(bucket.get()));

    test.ok(true, 'check what was read this time');
  }.bind(this), (delay++) * intervall);

  // 12. drop table
  setTimeout(function() {
    options.tableName = 'table1';
    var drop = new mysql.sqlDrop(options);
    drop.pipe(resultStream);

    test.ok(true, 'drop table');
  }.bind(this), (delay++) * intervall);

  // 13. drop the new user
  setTimeout(function() {
    var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop the new user...');
    mysqlAdmin.delete(accountId);
    mysqlAdmin.pipe(bucket);

    var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop the new user #2...');
    mysqlAdmin2.delete(accountId2);
    mysqlAdmin2.pipe(bucket);

    test.ok(true, 'drop the new user');
    test.end();

  }.bind(this), (delay++) * intervall);

});
