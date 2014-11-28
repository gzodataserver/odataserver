// sqlBase.js
//------------------------------
//
// 2014-11-27, Jonas Colmsjö
//
//------------------------------
//
// This module contains abstract classes to be implemented for each database
// that is supported. This file is only meant to be a guide for implementing
// new a relational databse. It is actually never used.
//
// NOTE: I've tried to put db specific parts in a wrapper class and the rests in
// a generic class taking the wrapper as an argument but I haven't found any
// good solution. The tricky part is that sqlWriteStream is a stream with a pipe
// function that can't take extra arguments.
//
// Classes:
//  * sqlBase        - base class with RDBMS specific parts
//  * sqlRead        - inhertis sqlBase
//  * sqlWriteStream - inherits Writable, also has parts unique to RDBMS
//  * sqlDelete      - inhertis sqlBase
//  * sqlDrop        - inhertis sqlBase
//  * sqlAdmin       - inhertis sqlBase
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

  var rdbms = require('rdbms');
  var u = require('underscore');

  h.debug = true;

  //
  // RDBMS base class inherited when streams not are inherited
  // =========================================================

  // helper for running SQL queries. `resultFunc` determines what should happen
  // with the result
  var runQuery = function(conn, sql, resultFunc, endFunc) {

  };

  var sqlBase = function(credentials) {
  };

  // Write results into a stream
  mysqlBase.prototype.pipe = function(writeStream) {
  };

  // Close the RDBMS connection
  mysqlBase.prototype.end = function() {
  };


  // Functions for RDBMS users (non-admin)
  // ====================================

  //
  // sql readable object
  // ---------------------
  //
  // This is NOT a stream but there is a function for piping the resutl
  // into a stream. There is also a function for fetching all rows into
  // a array.

  // sql - the sql select statement to run
  // processRowFunc - each row can be manipulated with this function before
  // it is returned
  exports.sqlRead = function(credentials, sql, processRowFunc) {
  };

  // inherit mysqlBase prototype
  exports.sqlRead.prototype = Object.create(mysqlBase.prototype);

  // Fetch all rows in to an array. `done` is then called with this
  // array is its only argument
  exports.sqlRead.prototype.fetchAll = function(done) {
  };


  //
  // RDBMS writable stream
  // ----------------------
  //

  // Execute select write result to stream
  //
  // MySQL reference
  // --------------
  //
  // http://dev.mysql.com/doc/refman/5.6/en/insert.html
  //
  // INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
  // [INTO] tbl_name
  // [PARTITION (partition_name,...)]
  // [(col_name,...)]
  // {VALUES | VALUE} ({expr | DEFAULT},...),(...),...
  // [ ON DUPLICATE KEY UPDATE
  //   col_name=expr
  //     [, col_name=expr] ... ]
  //
  //

  exports.sqlWriteStream = function(credentials, database, tableName, resultStream) {
  };

  // inherit stream.Writeable
  exports.sqlWriteStream.prototype = Object.create(Writable.prototype);

  // override the write function
  exports.sqlWriteStream.prototype._write = function(chunk, encoding, done) {
  };

  //
  // Delete from table
  // ------------------

  exports.sqlDelete = function(credentials, database, tableName, where) {
  };

  // inherit mysqlBase prototype
  exports.sqlDelete.prototype = Object.create(mysqlBase.prototype);


  //
  // Create table and write result to stream
  // ---------------------------------------

  // Create table and write the result to a stream.
  //
  // tableDef = {
  //    table_name: 'new_table',
  //    columns: [
  //      'id int not null auto_increment primary key',
  //      'int_col int',
  //      'float_col float',
  //      'char_col varchar(255)',
  //      'boolean bit(1)'
  //    ]
  //
  exports.sqlCreate = function(credentials, tableDef) {
  };

  // inherit mysqlBase prototype
  exports.sqlCreate.prototype = Object.create(mysqlBase.prototype);


  //
  // Drop table and write result to stream
  // ---------------------------------------

  // Drop a table if it exists and pipe the results to a stream
  exports.sqlDrop = function(credentials, tableName) {
  };

  // inherit mysqlBase prototype
  exports.sqlDrop.prototype = Object.create(mysqlBase.prototype);


  //
  // Manage RDBMS users - admin functions
  // ====================================

  // Admin constructor
  exports.sqlAdmin = function(credentials, accountId) {
  };


  // inherit mysqlBase prototype
  exports.sqlAdmin.prototype = Object.create(mysqlBase.prototype);

  // get RDBMS credentials for the object
  exports.sqlAdmin.prototype.getCredentials = function(password) {
  };

  // create new user
  exports.sqlAdmin.prototype.new = function() {
  };

  // Delete user
  exports.sqlAdmin.prototype.delete = function() {
  };

  // Set password for user
  exports.sqlAdmin.prototype.setPassword = function() {
  };

  // Grant
  exports.sqlAdmin.prototype.grant = function(tableName, accountId) {
  };

  // Revoke
  exports.sqlAdmin.prototype.revoke = function(tableName, accountId) {
  };


  // Get the service definition, e.g database model
  // sql:'select table_name, (data_length+index_length)/1024/1024 as mb from
  // information_schema.tables where table_schema="'+ schema + '"'};
  exports.sqlAdmin.prototype.serviceDef = function() {
  };

})(this);
