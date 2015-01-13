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
    // The port that the server should bind to
    PORT: '9000',
    // Number of rows to return if nothing else is specified
    DEFAULT_ROW_COUNT: 100,
    // Url for system operations - http(s)://HOST:PORT/SYS_PATH/[operation]
    SYS_PATH: 's',
    // Make sure that the backend works like sqlBase.js outlines if you change this
    RDBMS_BACKEND: './mysql.js',
  };

  // Some parameters user in the tests
  // ---------------------------------
  //

  c.TEST = {
    // The IP/DNS of the OData server
    HOST: 'localhost',
    // odata admin username - used in the tests (typically equals the admin user for the database)
    ADMIN_USER: process.env.ADMIN_USER,
    // odata admin password - used in the tests (typically equals the admin password for the database)
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    // The IP/DNS of the OData server
    EMAIL: 'test@gizur.com',
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


  // RDBMS (MySQL and MSSQL) configuration
  // ------------------------------------

  // These credentials are use to create new users. It can for instance be
  // the admin/root user, or you can also create a new user with only exactly
  // the needed priviledges for extra security
  c.RDBMS = {

    // DB admin/root username
    ADMIN_USER: process.env.ADMIN_USER,

    // MySQL admin/root password
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

    // DB host
    DB_HOST: 'localhost',

    // MySQL port
    DB_PORT: '3306',

    // schema/database
    DATABASE: 'mysql',

    // used by mssql only - options for mssql module
    OPTIONS: {
      encrypt: false // Use this if you're on Windows Azure
    }

  };


  // Logging setup
  // -------------

  c.testLoggerOptions = {debug: true, filename: 'test_XXX.js'};
  c.mysqlLoggerOptions = {debug: false, filename: 'mysql.js'};
  c.leveldbLoggerOptions = {debug: false, filename: 'leveldb.js'};
  c.odataServerLoggerOptions = {debug: true, filename: 'odataserver.js'};
  c.mainLoggerOptions = {debug: false, filename: 'main.js'};



  // dtrace setup
  // -------------

  c.enableDtrace = true;


  // Exports
  // =======

  module.exports = c;

})(this);
