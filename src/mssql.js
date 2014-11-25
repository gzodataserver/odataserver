// mssql.js
//------------------------------
//
// 2014-11-25, Jonas Colmsjö
//
//------------------------------
//
// Backend for MS SQL Server
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------


(function(self_, undefined) {

  var util = require('util');
  var h = require('./helpers.js');
  var CONFIG = require('./config.js');

  var mssql = require('mssql');
  var u = require('underscore');

  h.debug = true;

  // helper for running SQL queries. `resultFunc` determines what should happen
  // with the result
  var runQuery = function(conn, sql, resultFunc, endFunc) {
    var self = this;
    h.log.debug('MSSQL runQuery sql ('+conn.config.user+'): ' + sql);

    self.connection = new mssql.Connection(self.config, function(err) {

      // Connect to db and run callback
      sql.connect(self.config, function(err) {

        var request = new mssql.Request();
        request.stream = true;

        // or request.execute(procedure);
        request.query(self.sql);

        request.on('recordset', function(columns) {
          // Emitted once for each recordset in a query
          h.log.debug('MSSQL Recordset columns: '+columns);
        });

        request.on('row', function(row) {
          resultFunc(row);
          h.log.debug('MSSQL runQuery result: ' + JSON.stringify(row));
        });

        request.on('error', function(err) {
          // May be emitted multiple times
          h.log.log('MSSQL: error'+err);
        });

        request.on('done', function(returnValue) {
          h.log.debug('MSSQL runQuery end.');
          if(endFunc !== undefined) endFunc();
        });

      });

    });


  };

  var mssqlBase = function(credentials) {
    var self = this;

    // You can use 'server: localhost\\instance' to connect to named instance
    // You can enable streaming globally
    self.config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.host,
      database: CONFIG.MSSQL.DATABASE,
      options: CONFIG.MSSQL.OPTIONS
    };

    self.sql = null;
  };


  // Write results into a stream
  mssqlBase.prototype.pipe = function(writeStream) {
    var self = this;
    runQuery(self.connection, self.sql,
      function(row) {
        writeStream.write(JSON.stringify(row));
      },
      function() {
        self.connection.close();
      }
    );
  };

  // Close the MSSQL connection
  mssqlBase.prototype.end = function() {
    var self = this;
    self.connection.end();
  };


  //
  // Mssql readable object
  // ---------------------
  //
  // This is NOT a stream but there is a function for piping the result
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
  exports.mssqlRead = function(credentials, sql, processRowFunc) {
    var self = this;

    mssqlBase.call(this, credentials);

    self.sql = sql;
    self.credentials = credentials;
    self.processRowFunc = processRowFunc;
    self.result = [];

  };

  // inherit mysqlBase prototype
  exports.mssqlRead.prototype = Object.create(mssqlBase.prototype);

  // Fetch all rows in to an array. `done` is then called with this
  // array is its only argument
  exports.mssqlRead.prototype.fetchAll = function(done) {
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

})(this);
