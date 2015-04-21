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

/* GENERATES MYSQL ERROR IF THE ACCOUNTS DON'T EXIST, AND TEST DOES NOTE
   TERMINATE
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
*/

  test.end();
});

test('testing suite of functions, from create user to CRUD', function(test) {

  test.plan(9);

  adminOptions.sql = 'select 1';
  var mysqlRead = new mysql.sqlRead(adminOptions);
  var mysqlAdmin = new mysql.sqlAdmin(adminOptions);
  var mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);

  // simple select
  log.debug('Check that we can connect to the database');
  mysqlRead.pipe2(bucket)
    .then(function() {
      test.ok(adminOptions.credentials.user !== undefined &&
        adminOptions.credentials.password !== undefined,
        'MySQL credentials not set');
    })
  .then(function() {
    log.debug('Create new user #1...');
    mysqlAdmin.new(accountId);
    bucket.empty();
    return mysqlAdmin.pipe2(bucket);
  })
  .then(function() {
    log.debug('Create new user #2...');
    mysqlAdmin2.new(accountId2);
    bucket2.empty();
    return mysqlAdmin2.pipe2(bucket2);
  })
  .catch(function(err) {
    log.log('Error in create new user: ' + err);
  })

  // set passwords
  .then(function() {
    mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    options.credentials.password = mysqlAdmin.resetPassword(accountId);
    return mysqlAdmin.pipe2(bucket);
  })
  .then(function() {
    log.debug('Password set to: ' + options.credentials.password);

    mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    options2.credentials.password = mysqlAdmin2.resetPassword(accountId2);
    return mysqlAdmin2.pipe2(bucket);
  })
  .then(function() {
    log.debug('Password #2 set to: ' + options2.credentials.password);
    test.ok(true, 'set passwords');

    var userInfo = new mysql.userInfo(options);
    bucket.empty();
    return userInfo.pipe2(bucket);
  })
  .then(function() {
    test.deepEqual(bucket.get().toString(),
    '{"user()":"aebba2907b1f@localhost","current_user()":"aebba2907b1f@localhost"}',
    'check user information');

    // create table
    var tableDef = {
      tableName: 'table1',
      columns: [
      'col1 int',
      'col2 varchar(255)',
      ]
    };
    options.tableDef = tableDef;

    // Create mysql object with the new credentials
    var sqlCreate = new mysql.sqlCreate(options);

    bucket = new h.arrayBucketStream();
    log.debug('create using options:' + JSON.stringify(options));
    return sqlCreate.pipe2(bucket);
  })
  .then(function() {
    test.ok(true, 'create table');

    log.debug('Grant privs to table1 to user #2');
    mysqlAdmin = new mysql.sqlAdmin(options);
    mysqlAdmin.grant('table1', accountId2);
    return mysqlAdmin.pipe2(bucket);
  })
  .then(function() {
    test.ok(true, 'Grant privs to user #2');

    // insert into table
    options.tableName = 'table1';
    options.resultStream = resultStream;
    options.closeStream = false;
    var mysqlStream = new mysql.sqlWriteStream(options);

    var jsonReadStream = {};
    jsonReadStream.pipe = function(dest, data) {
      return new Promise(function(fulfill, reject) {
        dest.write(JSON.stringify(data),
        'utf-8',function() {
          fulfill();
        });
      });
    };

    // Write two rows - one at the time
    return jsonReadStream.pipe(mysqlStream, {
      col1: 11,
      col2: '11'
    }).then(function() {
      var mysqlStream2 = new mysql.sqlWriteStream(options);

      return jsonReadStream.pipe(mysqlStream2, {
        col1: 22,
        col2: '22'
      });
    });
  })
  .then(function() {
    test.ok(true, 'insert into table');

    log.debug('Read values using the mysql stream:');
    options.sql = 'select * from table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    return mysqlRead.pipe2(bucket);
  })
  .then(function() {
    test.deepEqual(bucket.get().toString(),
      '{"col1":11,"col2":"11"},{"col1":22,"col2":"22"}',
      'select from table');

    // Update table
    options.tableName = 'table1';
    options.jsonData = {
      col2: '33'
    };
    options.where = 'col1=22';
    var update = new mysql.sqlUpdate(options);
    return update.pipe2(resultStream);
  })
  .then(function() {
    options.sql = 'select * from table1';
    mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    return mysqlRead.pipe2(bucket);
  })
  .then(function() {
    test.deepEqual(bucket.get().toString(),
      '{"col1":11,"col2":"11"},{"col1":22,"col2":"33"}',
      'read table after update');

    log.debug('Revoke privs to table1 to user #2');
    mysqlAdmin = new mysql.sqlAdmin(options);
    mysqlAdmin.revoke('table1', accountId2);
    return mysqlAdmin.pipe2(bucket);
  })
  .then(function() {
/* NEED TO REMOVE THIS, TEST DOES NOT TERMINATE (EVEN THOUGH IT DOES NOT FAIL)

    log.debug('Read values of the mysql stream with user #2:');
    options2.sql = 'select * from ' + accountId + '.table1';
    mysqlRead = new mysql.sqlRead(options2);
    bucket.empty();
    return mysqlRead.pipe2(bucket);
  })
  .then(function() {
    test.deepEqual(bucket.get().toString(),
      '{"error":{"code":"ER_DBACCESS_DENIED_ERROR","errno":1044,'+
         '"sqlState":"42000","fatal":true}}',
      'select from ' + accountId + '.table1 should be empty now');
*/
    // delete from table
    options.tableName = 'table1';
    options.where = 'col1=22';
    var del = new mysql.sqlDelete(options);
    return del.pipe2(resultStream);
  })
  .then(function() {
    // read table
    options.sql = 'select * from table1';
    var mysqlRead = new mysql.sqlRead(options);
    bucket.empty();
    return mysqlRead.pipe2(bucket);
  })
  .then(function() {
    test.equal(bucket.get().toString(), '{"col1":11,"col2":"11"}',
      'select after delete');

    // drop table
    options.tableName = 'table1';
    var drop = new mysql.sqlDrop(options);
    return drop.pipe2(resultStream);
  })
  .then(function() {
    // drop the new user
    mysqlAdmin = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop user #1...');
    mysqlAdmin.delete(accountId);
    return mysqlAdmin.pipe2(bucket);
  })
  .then(function() {
    mysqlAdmin2 = new mysql.sqlAdmin(adminOptions);
    log.debug('Drop user #2...');
    mysqlAdmin2.delete(accountId2);
    return mysqlAdmin2.pipe2(bucket);
  })
  .then(function() {
    log.log('END OF TEST!')
    test.end();
  })
  .catch(function(err) {
    log.log('Error in test: ' + err);
    test.end();
  });

});
