// template.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Template for modules whowing how inheritance and exports are done
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

(function(self_, undefined) {

  // * sql - the sql select statement to run
  // * processRowFunc - each row can be manipulated with this function before
  // it is returned
  exports.mysqlRead = function(credentials, sql, processRowFunc) {
    var self = this;

    mysqlBase.call(this, credentials);

    self.sql = sql;
    self.processRowFunc = processRowFunc;
    self.result = [];
  };

  // inherit mysqlBase prototype
  exports.mysqlRead.prototype = Object.create(mysqlBase.prototype);

  // Fetch all rows in to an array. `done` is then called with this
  // array is its only argument
  exports.mysqlRead.prototype.fetchAll = function(done) {
    var self = this;

    runQuery(self.connection, self.sql,
      function(row) {
        self.result.push(processRow(row));
      },
      function() {
        done(self.result);
      }
    );

  };



})(this);
