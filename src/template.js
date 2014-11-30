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

  // options: {
  //  * sql - the sql select statement to run
  //  * processRowFunc - each row can be manipulated with this function before
  //                     it is returned
  // }
  // exports.sqlRead = function(credentials, sql, processRowFunc) {
  exports.sqlRead = function(options) {
    var self = this;

    mysqlBase.call(this, options);

    self.options = options;
    self.sql = options.sql;
    //    self.processRowFunc = options.processRowFunc;
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
        self.result.push(processRow(self, row));
      },
      function() {
        self.connection.end();
        done(self.result);
      }
    );

  };



})(this);
