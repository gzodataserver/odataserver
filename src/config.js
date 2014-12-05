//
// config.js
//
// A good way to manage sensitive data like passwords is to use environment
// varaibles. For instance: `process.env.ADMIN_PASSWORD`
//
//

(function(self_, undefined) {


  var c = self_.config || {};


  // OData server configuration
  // --------------------------
  //

  c.ODATA = {
    // The IP/DNS of the OData server (used by the tests to connect)
    HOST: 'localhost',
    // The port that the server should bind to
    PORT: '9000',
    // Number of rows to return if nothing else is specified
    DEFAULT_ROW_COUNT: 100
  };


  // Account IDs are based email adresses
  // -------------------------------------

  // Documentation of the hash function used is found here:
  // http://nodejs.org/api/crypto.html
  c.ACCOUNT_ID = {

    // a secret salt used when generating the account ids
    // can for instance be generated like this: `openssl rand -base64 32`
    SECRET_SALT: 'MnS3FQfXIbtMrvT6Y1zboNHLkiX/hui0NVqcR33EoQs=',

    // algorith use to create account id. 'sha1', 'md5', 'sha256', 'sha512', etc.
    // `openssl list-message-digest-algorithms` will display the available digest algorithms
    HASH_ALG: 'sha1',

    // 'utf8', 'ascii' or 'binary'
    HASH_ENCODING: 'hex'
  };


  // MySQL configuration
  // -------------------

  // These credentials are use to create new users. It can for instance be
  // the admin/root user, or you can also create a new user with only exactly
  // the needed priviledges for extra security
  c.MYSQL = {

    // MySQL admin/root username
    ADMIN_USER: process.env.ADMIN_USER,

    // MySQL admin/root password
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

    // MySQL host
    DB_HOST: 'localhost',

    // MySQL port
    DB_PORT: '3306'

  };


  // MSSQL configuration
  // -------------------

  // These credentials are use to create new users. It can for instance use
  // the sysadmin role, or you can also create a new user/role with only exactly
  // the needed priviledges for extra security
  c.MSSQL = {

    // MySQL admin/root username
    ADMIN_USER: process.env.ADMIN_USER,

    // MySQL admin/root password
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

    DATABASE: 'XXX',

    // MS SQL host
    DB_HOST: 'localhost',

    // options for mssql module
    OPTIONS: {
      encrypt: false // Use this if you're on Windows Azure
    }

  };


  // Logging setup
  // -------------

  c.testLoggerOptions = {debug: true, filename: 'test_XXX.js'};
  c.mysqlLoggerOptions = {debug: false, filename: 'mysql.js'};
  c.leveldbLoggerOptions = {debug: false, filename: 'leveldb.js'};
  c.odataServerLoggerOptions = {debug: false, filename: 'odataserver.js'};
  c.mainLoggerOptions = {debug: false, filename: 'main.js'};



  // Exports
  // =======

  module.exports = c;

})(this);
