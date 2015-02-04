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
//  * `mysqlBase`      - base class with MySQL specific parts
//  * `sqlRead`        - inhertis mysqlBase
//  * `sqlWriteStream` - inherits Writable, have parts unique to MySQL
//  * `sqlDelete`      - inhertis mysqlBase
//  * `sqlDrop`        - inhertis mysqlBase
//  * `sqlAdmin`       - inhertis mysqlBase
//
// Arguments used in the constructors:
//
//     options = {
//       credentials: {
//         user: '',
//         passwrod: ''
//       },
//       sql :'',
//       database: '',
//       tableName: '',
//       where: '',
//       processRowFunc: '',
//       closeStream: true | false,
//       resultStream: process.stdout etc.
//       processRowFunc: function used in sqlRead to manipulate each row read, used
//                       for add eTags etc.
//     };
//
// NOTES:
// * `closeStream` - is not always taken into account, should look over this
//
//
//------------------------------
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//

(function(moduleSelf, undefined) {

  var Readable = require('stream').Readable;
  var Writable = require('stream').Writable;
  var util = require('util');
  var h = require('./helpers.js');
  var CONFIG = require('./config.js');

  var mysql = require('mysql');
  var u = require('underscore');

  var log = new h.log0(CONFIG.mysqlLoggerOptions);

  //
  // MySQL base class inherited when streams not are inherited
  // =========================================================

  // helper for running SQL queries. `resultFunc` determines what should happen
  // with the result
  var runQuery = function(conn, sql, resultFunc, endFunc, errFunc, fieldsFunc) {
    var self = this;
    log.debug('runQuery sql (' + conn.config.user + '): ' + sql);

    conn.on('error', function(err) {
      log.log('runQuery error in MySQL connection: ' + err.code); // 'ER_BAD_DB_ERROR'
    });

    // connect to the mysql server using the connection
    conn.connect();

    // Run the query
    var query = conn.query(sql);

    query
      .on('fields', function(fields) {
        log.debug('fields: ' + JSON.stringify(fields));
        if (fieldsFunc !== undefined) {
          fieldsFunc(fields);
        }
      })
      .on('result', function(row) {
        resultFunc(row);
        log.debug('runQuery result: ' + JSON.stringify(row));
      })
      .on('error', function(err) {
        log.log('runQuery error: ' + err);
        if (errFunc !== undefined) {
          errFunc(err);
        }
        log.debug('after errFunc(err)');
      })
      .on('end', function() {
        log.debug('runQuery end.');
        if (endFunc !== undefined) {
          endFunc();
        }
      });

  };

  // `self.options` needs to be defined in the object that inherits this object
  var mysqlBase = function(credentials) {
    var self = this;
    log.debug('mysqlBase constructor');
    credentials.host = CONFIG.RDBMS.DB_HOST;
    self.connection = mysql.createConnection(credentials);
    self.sql = null;
    log.debug('mysqlBase options:' + JSON.stringify(credentials) +
      ',conn.config:' + JSON.stringify(self.connection.config));
  };

  // Write results into a stream
  mysqlBase.prototype.pipe = function(writeStream, endFunc, errFunc) {
    var self = this;
    log.debug('mysqlBase.pipe: ' + self.sql);

    runQuery(self.connection, self.sql,
      // result func
      function(row) {
        log.debug('pipe result: ' + JSON.stringify(self.options.credentials));
        writeStream.write(JSON.stringify(row));
      },
      // end func
      function() {
        log.debug('pipe end: ' + JSON.stringify(self.options.credentials));
        self.connection.end();
        if (self.options.closeStream) {
          writeStream.end();
        }
        if (endFunc !== undefined) {
          endFunc();
        }
      },
      // error func
      function(err) {
        log.debug('pipe error: ' + JSON.stringify(self.options.credentials));

        if (writeStream.writeHead !== undefined) {
          writeStream.writeHead(406, {
            "Content-Type": "application/json"
          });
        }

        writeStream.write(JSON.stringify({
          error: err
        }));
        //self.connection.end();
        if (self.options.closeStream) {
          writeStream.end();
        }
        if (errFunc !== undefined) {
          errFunc(err);
        }
      },
      // fields (header) func
      function(fields) {
        log.debug('fields: ' + JSON.stringify(fields));

        if (writeStream.writeHead !== undefined) {
          writeStream.writeHead(200, {
            "Content-Type": "application/json"
          });
        }

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
  var processRow = function(self, row) {
    if (self.processRowFunc !== undefined) {
      return self.processRowFunc(row);
    }
    return row;
  };

  // The `options` object must contain:
  //
  //     options: {
  //      * sql - the sql select statement to run
  //      * processRowFunc - each row can be manipulated with this function before
  //                     it is returned
  //     }
  exports.sqlRead = function(options) {
    var self = this;

    mysqlBase.call(this, options.credentials);

    self.processRowFunc = options.processRowFunc;
    self.options = options;
    self.sql = options.sql;
    self.result = [];
  };

  // inherit `mysqlBase` prototype
  exports.sqlRead.prototype = Object.create(mysqlBase.prototype);

  // Fetch all rows in to an array. `resultFunc` is then called with this
  // array is its only argument. `errFunc` is used in case of errors.
  exports.sqlRead.prototype.fetchAll = function(resultFunc, errFunc) {
    var self = this;

    runQuery(self.connection, self.sql,
      function(row) {
        log.debug('processRow(self, row): ' + processRow(self, row));
        self.result.push(processRow(self, row));
      },
      function() {
        self.connection.end();
        resultFunc(self.result);
      },
      function(err) {
        self.connection.end();
        if (errFunc !== undefined) {
          errFunc(err);
        }
      }
    );

  };

  //
  // Mysql writable stream
  // ----------------------

  exports.sqlWriteStream = function(options, endFunc, errFunc) {
    var self = this;
    // call `stream.Writeable` constructor
    Writable.call(this);

    self.options = options;
    self.options.credentials.host = CONFIG.RDBMS.DB_HOST;

    self.connection = mysql.createConnection(self.options.credentials);
    self.data = '';
    self.jsonOK = false;
    self.endFunc = endFunc;
    self.errFunc = errFunc;
  };

  // inherit `stream.Writeable`
  exports.sqlWriteStream.prototype = Object.create(Writable.prototype);

  // override the `write` function
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
      log.debug('_write could not parse this JSON' +
        ' (waiting for next chunk and trying again): ' +
        self.data);
      // just wait for the next chunk in case of an error
      self.jsonOK = false;
      done();
    }

    var sql = h.json2insert(self.options.credentials.database,
      self.options.tableName, json);

    runQuery(self.connection, sql,
      function(row) {
        self.options.resultStream.write(JSON.stringify(row));
        done();
      },
      function() {
        self.connection.end();
        if (self.options.closeStream) {
          self.options.resultStream.end();
        }
        if (self.endFunc) {
          self.endFunc();
        }
      },
      function(err) {
        if (self.errFunc !== undefined) {
          self.errFunc(err);
        }
      }
    );

  };

  //
  // Delete from table
  // ------------------

  exports.sqlDelete = function(options) {
    var self = this;
    mysqlBase.call(this, options.credentials);
    self.options = options;
    self.sql = 'delete from ' + options.credentials.database + '.' +
      options.tableName;
    if (options.where !== undefined) {
      self.sql += 'where' + options.where;
    }
  };

  // inherit `mysqlBase` prototype
  exports.sqlDelete.prototype = Object.create(mysqlBase.prototype);

  //
  // Create table and write result to stream
  // ---------------------------------------
  exports.sqlCreate = function(options) {
    var self = this;
    mysqlBase.call(this, options.credentials);
    self.options = options;
    self.sql = 'create table ' + options.tableDef.tableName + ' (' +
      options.tableDef.columns.join(',') + ')';
    log.debug('exports.sqlCreate: ' + self.sql);
  };

  // inherit `mysqlBase` prototype
  exports.sqlCreate.prototype = Object.create(mysqlBase.prototype);

  //
  // Drop table and write result to stream
  // ---------------------------------------

  // Drop a table if it exists and pipe the results to a stream
  exports.sqlDrop = function(options) {
    var self = this;
    mysqlBase.call(this, options.credentials);
    self.options = options;
    self.sql = 'drop table if exists ' + options.tableName + ';';
  };

  // inherit `mysqlBase` prototype
  exports.sqlDrop.prototype = Object.create(mysqlBase.prototype);

  //
  // Manage MySQL users - admin functions
  // ====================================

  // Admin constructor
  exports.sqlAdmin = function(options) {
    var self = this;
    self.options = options;

    // Allow multiple statements
    self.options.credentials.multipleStatements = true;

    mysqlBase.call(this, self.options.credentials);

  };

  // inherit `mysqlBase` prototype
  exports.sqlAdmin.prototype = Object.create(mysqlBase.prototype);

  // get MySQL credentials for the object
  exports.sqlAdmin.prototype.getCredentials = function(password) {
    return {
      host: CONFIG.RDBMS.HOST,
      database: self.options.accountId,
      user: self.options.accountId,
      password: password
    };
  };

  // create new user
  exports.sqlAdmin.prototype.new = function(accountId) {
    var self = this;
    self.sql = 'create database ' + accountId + ';';
    self.sql += "create user '" + accountId + "'@'localhost';";
    self.sql += "grant all privileges on " + accountId + ".* to '" +
      accountId + "'@'localhost' with grant option;";
  };

  // Delete user
  exports.sqlAdmin.prototype.delete = function(accountId) {
    var self = this;
    self.sql = "drop user '" + accountId + "'@'localhost';";
    self.sql += 'drop database ' + accountId + ';';
  };

  // Set password for user
  exports.sqlAdmin.prototype.resetPassword = function(accountId) {
    var self = this;
    var password = h.randomString(12);
    self.sql = "set password for '" + accountId + "'@'localhost' = password('" +
      password + "');";
    return password;
  };

  // Grant
  exports.sqlAdmin.prototype.grant = function(tableName, accountId) {
    var self = this;
    self.sql = "grant insert, select, update, delete on " + tableName +
      " to '" + accountId + "'@'localhost';";
  };

  // Revoke
  exports.sqlAdmin.prototype.revoke = function(tableName, accountId) {
    var self = this;
    self.sql = "revoke insert, select, update, delete on " + tableName +
      " from '" + accountId + "'@'localhost';";
  };

  // Get the size of the databse and the service definition, e.g the database
  // model
  exports.sqlAdmin.prototype.serviceDef = function(accountId) {
    var self = this;
    self.sql =
      'select table_name, (data_length+index_length)/1024/1024 as mb ' +
      'from information_schema.tables where table_schema="' + accountId +
      '"';
  };

})(this);
