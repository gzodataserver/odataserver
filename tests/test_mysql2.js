// test_mysql2.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// These tests uses the new promise based functions
//
// NOTE: Few proper test conditions. The purpose is mainly to run all functions
//       without errors thrown.
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
var loggerOptions = CONFIG.testLoggerOptions;
loggerOptions.filename = '# test_mysql2.js'
var log = new h.log0(loggerOptions);

var moduleSelf = this;

var resultStream = process.stderr;
var decoder = new StringDecoder('utf8');
log.debug('XXX decoder: '+decoder)

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
    ' is used as output stream.');

  adminOptions.tableName = accountId + '.table1';
  var drop = new mysql.sqlDrop(adminOptions);
  log.debug('After new mysql.sqlDrop');
  drop.pipe2(bucket)
    .then(function() {
      log.debug('Drop user #1...');
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      mysqlAdmin.delete(accountId);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      log.debug('Drop user #2...');
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      mysqlAdmin.delete(accountId2);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      log.debug('End setUp');
      test.end();
    })
    .catch(function(err) {
      log.log('Error in setUp: ' + err);
      test.end();
    })

});

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
  log.debug('select 1...');
  adminOptions.sql = 'select 1';
  var mysqlRead = new mysql.sqlRead(adminOptions);
  mysqlRead.pipe2(bucket)
    .then(function() {
      test.ok(adminOptions.credentials.user !== undefined &&
        adminOptions.credentials.password !== undefined,
        'MySQL credentials not set');
    })

  // 2. create new user
  .then(function() {
      //test.deepEqual(bucket.get() === expected1, 'Test section #1 did not return the expected result');
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      log.debug('Create new user...');
      mysqlAdmin.new(accountId);
      bucket.empty();
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      log.debug('Create new user #2...');
      mysqlAdmin2.new(accountId2);
      bucket2.empty();
      return mysqlAdmin2.pipe2(bucket2);
    })
    .then(function() {
      test.ok(true, 'create new user');
    })
    .catch(function(err) {
      log.log('Error in create new user: ' + err);
    })

  // 3. set passwords
  .then(function() {
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      options.credentials.password = mysqlAdmin.resetPassword(accountId);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      log.debug('Password set to: ' + options.credentials.password);

      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      options2.credentials.password = mysqlAdmin2.resetPassword(accountId2);
      return mysqlAdmin2.pipe2(bucket);
    })
    .then(function() {
      log.debug('Password #2 set to: ' + options2.credentials.password);
      test.ok(true, 'set passwords');

      // 4. create table
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
      return create.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'create table');

      // 5. Grant privs to user #2
      log.debug('Grant privs to table1 to user #2');
      var mysqlAdmin = new mysql.sqlAdmin(options);
      mysqlAdmin.grant('table1', accountId2);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'Grant privs to user #2');

      // 6. insert into table - PROMISE NOT IMPLEMENTED AND NO CALLBACK!!
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
    })
    // 7. select from table
    .then(function() {
      log.debug('Read values of the mysql stream:');
      options.sql = 'select * from table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      return mysqlRead.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'select from table');

      // 9.Update table
      options.tableName = 'table1';
      options.jsonData = {
        col2: '33'
      };
      options.where = 'col1=22';
      var update = new mysql.sqlUpdate(options);
      return update.pipe2(resultStream);
    })
    .then(function() {
      test.ok(true, 'update table');

      // 10. read table
      options.sql = 'select * from table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      return mysqlRead.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'read table after update');

      // 11. check what was read this time
log.debug('decoder: '+decoder);

      log.debug('BUCKET CONTENTS update (decoded):' +
        decoder.write(bucket.get()));

      test.ok(true, 'check what was read this time');

      // 8. wait four seconds and write results
      var decoder = new StringDecoder('utf8');
      log.debug('BUCKET CONTENTS after insert (decoded):' +
        decoder.write(bucket.get()));
      test.ok(true, 'wait four seconds and write results');
    })
    .then(function() {
      log.debug('Revoke privs to table1 to user #2');

      var mysqlAdmin = new mysql.sqlAdmin(options);
      mysqlAdmin.revoke('table1', accountId2);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'Revoke privs from user #2');

      // Y. select from table
      log.debug('Read values of the mysql stream with user #2:');
      options.sql = 'select * from ' + accountId + '.table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      return mysqlRead.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'select from ' + accountId + '.table1');

      // Z. wait four seconds and write results
      var decoder = new StringDecoder('utf8');
      log.debug('BUCKET CONTENTS after insert (decoded):' +
        decoder.write(bucket.get()));
      test.ok(true, 'wait four seconds and write results');
    })
    .then(function() {
      // 9. delete from table
      options.tableName = 'table1';
      var del = new mysql.sqlDelete(options);
      return del.pipe2(resultStream);
    })
    .then(function() {
      test.ok(true, 'delete from table');

      // 10. read table
      options.sql = 'select * from table1';
      var mysqlRead = new mysql.sqlRead(options);
      bucket.empty();
      return mysqlRead.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'read table');

      // 11. check what was read this time
      log.debug('BUCKET CONTENTS delete (decoded):' +
        decoder.write(bucket.get()));

      test.ok(true, 'check what was read this time');
    })
    .then(function() {
      // 12. drop table
      options.tableName = 'table1';
      var drop = new mysql.sqlDrop(options);
      return drop.pipe2(resultStream);
    })
    .then(function() {
      test.ok(true, 'drop table');

      // 13. drop the new user
      var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop the new user...');
      mysqlAdmin.delete(accountId);
      return mysqlAdmin.pipe2(bucket);
    })
    .then(function() {
      var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
      log.debug('Drop the new user #2...');
      mysqlAdmin2.delete(accountId2);
      return mysqlAdmin2.pipe2(bucket);
    })
    .then(function() {
      test.ok(true, 'drop the new user XXX');
      test.end();
    })
    .catch(function(err) {
      log.log('Error in test: ' + err);
      test.end();
    });

});
