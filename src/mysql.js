// mysql.js
//------------------------------
//
// 2014-11-27, Jonas Colmsjö
//
//------------------------------
//
// Implementation of sql functions with on top of MySQL.
//
// NOTE: see sqlBase.js for documentation about the classes.
//
// Classes:
//  * mysqlBase      - base class with MySQL specific parts
//  * sqlRead        - inhertis mysqlBase
//  * sqlWriteStream - inherits Writable, have parts unique to MySQL
//  * sqlDelete      - inhertis mysqlBase
//  * sqlDrop        - inhertis mysqlBase
//  * sqlAdmin       - inhertis mysqlBase
//
//
//------------------------------
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//


(function(self_, undefined) {

  var Readable = require('stream').Readable;
  var Writable = require('stream').Writable;
  var util = require('util');
  var h = require('./helpers.js');
  var CONFIG = require('./config.js');

  var mysql = require('mysql');
  var u = require('underscore');

  var log = new h.log0({debug: false});

  //
  // MySQL base class inherited when streams not are inherited
  // =========================================================

  // helper for running SQL queries. `resultFunc` determines what should happen
  // with the result
  var runQuery = function(conn, sql, resultFunc, endFunc) {
    var self = this;
    log.debug('runQuery sql ('+conn.config.user+'): ' + sql);

    // connect to the mysql server using the connection created in init
    conn.connect();
    // pipe the result to hte result stream provided
    var query = conn.query(sql);

    query
      .on('result', function(row) {
        resultFunc(row);
        log.debug('runQuery result: ' + JSON.stringify(row));
      })
      .on('error', function(err) {
        log.log('runQuery error: ' + err);
      })
      .on('end', function() {
        log.debug('runQuery end.');
        if(endFunc !== undefined) endFunc();
      });

  };

  var mysqlBase = function(credentials) {
    var self = this;
    credentials.host = CONFIG.MYSQL.DB_HOST;
    self.connection = mysql.createConnection(credentials);
    self.sql = null;
  };

  // Write results into a stream
  mysqlBase.prototype.pipe = function(writeStream) {
    var self = this;
    runQuery(self.connection, self.sql,
      function(row) {
        writeStream.write(JSON.stringify(row));
      },
      function() {
        self.connection.end();
        writeStream.end();
      }
    );
  };

  // Close the MySQL connection
  mysqlBase.prototype.end = function() {
    var self = this;
    self.connection.end();
  };


  // Functions for Mysql users (non-admin)
  // ====================================

  //
  // Mysql readable object
  // ---------------------
  //
  // This is NOT a stream but there is a function for piping the resutl
  // into a stream. There is also a function for fetching all rows into
  // a array.

  // private helper function
  var processRow = function(row) {
    var self = this;

    if (self.processRowFunc !== undefined) return self.processRowFunc(row);
    return row;
  };


  // * sql - the sql select statement to run
  // * processRowFunc - each row can be manipulated with this function before
  // it is returned
  exports.sqlRead = function(credentials, sql, processRowFunc) {
    var self = this;

    mysqlBase.call(this, credentials);

    self.sql = sql;
    self.processRowFunc = processRowFunc;
    self.result = [];
  };

  // inherit mysqlBase prototype
  exports.sqlRead.prototype = Object.create(mysqlBase.prototype);

  // Fetch all rows in to an array. `done` is then called with this
  // array is its only argument
  exports.sqlRead.prototype.fetchAll = function(done) {
    var self = this;

    runQuery(self.connection, self.sql,
      function(row) {
        self.result.push(processRow(row));
      },
      function() {
        self.connection.end();
        done(self.result);
      }
    );

  };


  //
  // Mysql writable stream
  // ----------------------
  //

  exports.sqlWriteStream = function(credentials, database, tableName, resultStream) {
    // call stream.Writeable constructor
    Writable.call(this);
    var self = this;

    credentials.host = CONFIG.MYSQL.DB_HOST;

    self.connection = mysql.createConnection(credentials);
    self.database = database;
    self.tableName = tableName;
    self.data = '';
    self.jsonOK = false;
    self.resultStream = resultStream;
  };


  // inherit stream.Writeable
  exports.sqlWriteStream.prototype = Object.create(Writable.prototype);

  // override the write function
  exports.sqlWriteStream.prototype._write = function(chunk, encoding, done) {
    var self = this;
    var json;

    // append chunk to previous data, if any
    self.data += chunk;

    // try to parse the data
    try {
      json = JSON.parse(self.data);
      self.jsonOK = true;
      log.debug('_write parsed this JSON: ' + JSON.stringify(json));
    } catch (error) {
      log.debug('_write could not parse this JSON (waiting for next chunk and trying again): ' +
        self.data);
      // just wait for the next chunk
      self.jsonOK = false;
      done();
    }

    var sql = h.json2insert(self.database, self.tableName, json);

    runQuery(self.connection, sql,
      function(row) {
        self.resultStream.write(JSON.stringify(row));
        done();
      },
      function() {
        self.connection.end();
      }
    );

  };

  //
  // Delete from table
  // ------------------

  exports.sqlDelete = function(credentials, database, tableName, where) {
    var self = this;
    mysqlBase.call(this, credentials);

    self.sql = 'delete from '+ database + '.' + tableName;
    if (where !== undefined) self.sql += 'where' + where;
  };

  // inherit mysqlBase prototype
  exports.sqlDelete.prototype = Object.create(mysqlBase.prototype);


  //
  // Create table and write result to stream
  // ---------------------------------------

  exports.sqlCreate = function(credentials, tableDef) {
    var self = this;
    mysqlBase.call(this, credentials);
    self.sql = 'create table '+tableDef.table_name + ' (' + tableDef.columns.join(',') + ')';
  };

  // inherit mysqlBase prototype
  exports.sqlCreate.prototype = Object.create(mysqlBase.prototype);


  //
  // Drop table and write result to stream
  // ---------------------------------------

  // Drop a table if it exists and pipe the results to a stream
  exports.sqlDrop = function(credentials, tableName) {
    var self = this;
    mysqlBase.call(this, credentials);
    self.sql = 'drop table if exists '+tableName+';';
  };

  // inherit mysqlBase prototype
  exports.sqlDrop.prototype = Object.create(mysqlBase.prototype);


  //
  // Manage MySQL users - admin functions
  // ====================================

  // Admin constructor
  exports.sqlAdmin = function(credentials, accountId) {
    var self = this;

    // Allow multiple statements
    credentials.multipleStatements = true;

    mysqlBase.call(this, credentials);

    self.accountId = accountId; //h.email2accountId(email);
    self.password = null;
  };


  // inherit mysqlBase prototype
  exports.sqlAdmin.prototype = Object.create(mysqlBase.prototype);

  // get MySQL credentials for the object
  exports.sqlAdmin.prototype.getCredentials = function(password) {
    return {
      host: CONFIG.MYSQL.HOST,
      database: self.accountId,
      user: self.accountId,
      password: password
    };
  };

  // create new user
  exports.sqlAdmin.prototype.new = function() {
    var self = this;
    self.sql  = 'create database '+self.accountId+';';
    self.sql += "create user '"+self.accountId+"'@'localhost';";
    self.sql += "grant all privileges on "+self.accountId+".* to '"+
                    self.accountId+"'@'localhost' with grant option;";
  };

  // Delete user
  exports.sqlAdmin.prototype.delete = function() {
    var self = this;
    self.sql  = "drop user '"+self.accountId+"'@'localhost';";
    self.sql += 'drop database '+self.accountId+';';
  };

  // Set password for user
  exports.sqlAdmin.prototype.setPassword = function() {
    var self = this;
    self.password = h.randomString(12);
    self.sql = "set password for '"+self.accountId+"'@'localhost' = password('"+
            self.password+"');";
  };

  // Grant
  exports.sqlAdmin.prototype.grant = function(tableName, accountId) {
    var self = this;
    //var accountId=h.email2accountId(email);
    self.sql = "grant insert, select, update, delete on "+tableName+" to '"+
            accountId+"'@'localhost';";
  };

  // Revoke
  exports.sqlAdmin.prototype.revoke = function(tableName, accountId) {
    var self = this;
    //var accountId=h.email2accountId(email);
    self.sql = "revoke insert, delete, update, delete on "+tableName+" to '"+
            accountId+"'@'localhost';";
  };


  // Get the service definition, e.g database model
  // sql:'select table_name, (data_length+index_length)/1024/1024 as mb from information_schema.tables where table_schema="'+ schema + '"'};
  exports.sqlAdmin.prototype.serviceDef = function() {
    var self = this;
    //var accountId=h.email2accountId(email);
    self.sql = 'select table_name, (data_length+index_length)/1024/1024 as mb '+
            'from information_schema.tables where table_schema="'+
            self.accountID + '"';
  };

})(this);
