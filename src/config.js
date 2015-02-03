//
// config.js
//
// A good way to manage sensitive data like passwords is to use environment
// varaibles. For instance: `process.env.ADMIN_PASSWORD`
//
//

(function(moduleSelf, undefined) {

  var c = {};

  // OData server configuration
  // --------------------------
  //

  c.ODATA = {
    // The IP/DNS of the OData server
    HOST: 'localhost',

    // The port that the server should bind to
    PORT: '9000',

    // Number of rows to return if nothing else is specified
    DEFAULT_ROW_COUNT: 100,

    // Url for system operations - http(s)://HOST:PORT/SYS_PATH/[operation]
    SYS_PATH: 's',

    // Make sure that the RDBMS backend works like sqlBase.js outlines if you
    // change this
    RDBMS_BACKEND: './mysql.js',

    // The prefix used in the name of buckets
    BUCKET_PREFIX: 'b_',

    // Make sure that the bucket backend works like leveldb.js if you change
    // this
    BUCKET_BACKEND: './leveldb.js',

    // The prefix used in the name of buckets
    HELP_PATH: 'help',

    // The prefix used in the name of buckets
    HELP_FILE: './docs/Usage.md',

    // How long the reset password link is valid (using Date.now() to generate
    // timestamps)
    EXPIRE_RESET_PASSWORD: 24 * 60 * 60 * 1000,
  };

  // HTTPS settings
  // -------------------------
  //

  c.HTTPS_OPTIONS = {
    USE_HTTPS: false,
    KEY_FILE: './server.key',
    CERT_FILE: './server.cer'
  };

  // Settings for sending mails
  // -------------------------
  //
  // [Nodemailer](https://github.com/andris9/Nodemailer) is used for sending
  // mails

  c.nodeMailerOptions = {
    service: 'Gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  };

  c.MAIL_OPTIONS = {
    // sender address
    from: 'noreply@gizur.com',

    // list of receivers
    to: 'this will be replaced',

    // Subject line
    subject: 'Reset password',

    // plaintext body
    text: 'The link below link is valid for 24 hours. ' +
          'Copy it into a browser.\n',

    // html body
    html: '<b>The link below link is valid for 24 hours.</b><br/>'
  };

  // Some parameters user in the tests
  // ---------------------------------
  //

  c.TEST = {
    // odata admin username - used in the tests (typically equals the admin
    // user for the database)
    ADMIN_USER: process.env.ADMIN_USER,

    // odata admin password - used in the tests (typically equals the admin
    // password for the database)
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

    // The IP/DNS of the OData server
    EMAIL: 'test@gizur.com',
    EMAIL2: 'test2@gizur.com',

    // IMPORTANT: This is only used for tests. It must always be set to false
    // in production
    RESET_PASSWORD_WITHOUT_LINK: true,
  };

  // Account IDs are based email adresses
  // -------------------------------------

  // Documentation of the hash function used is found here:
  // http://nodejs.org/api/crypto.html
  c.ACCOUNT_ID = {

    // a secret salt used when generating the account ids
    // can for instance be generated like this: `openssl rand -base64 32`
    SECRET_SALT: 'MnS3FQfXIbtMrvT6Y1zboNHLkiX/hui0NVqcR33EoQs=',

    // algorith use to create account id. 'sha1', 'md5', 'sha256', 'sha512',
    // etc. `openssl list-message-digest-algorithms` will display the available
    // digest algorithms
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

  // The # before test_XXX is necessary for the test TAP protocol
  c.testLoggerOptions = {
    debug: false,
    filename: '# test_XXX.js',
    noLogging: false
  };

  // NOTE: should turn logging on in production. Turned off here in order for
  // the tests output to comply with the TAP protocol
  c.mysqlLoggerOptions = {
    debug: false,
    filename: 'mysql.js',
    noLogging: true
  };

  c.leveldbLoggerOptions = {
    debug: false,
    filename: 'leveldb.js',
    noLogging: true
  };

  c.odataServerLoggerOptions = {
    debug: false,
    filename: 'odataserver.js',
    noLogging: false
  };

  c.mainLoggerOptions = {
    debug: false,
    filename: 'main.js',
    noLogging: true
  };

  // dtrace setup
  // -------------

  c.enableDtrace = true;

  // Too Busy setup
  // -------------
  // The server will respond inidicating that it is too busy in order to keep
  // the response times. NOTE: Using tooBusy will prevent the tests from
  // completing (a timer is running in the event loop)

  c.enableTooBusy = false;

  // Exports
  // =======

  module.exports = c;

})(this);
