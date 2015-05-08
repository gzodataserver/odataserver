//
// config.js
//
// A good way to manage sensitive data like passwords is to use environment
// varaibles. For instance: `process.env.ADMIN_PASSWORD`
//
//

(function(moduleSelf, undefined) {

  var util = require('util');

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

    // Url for system operations - http(s)://HOST:PORT/ACCOUNT/SYS_PATH/[operation]
    SYS_PATH: 's',

    // The prefix used in the name of buckets
    BUCKET_PREFIX: 'b_',

    // The prefix used in the name of buckets
    HELP_PATH: 'help',

    // How long the reset password link is valid (using Date.now() to generate
    // timestamps)
    EXPIRE_RESET_PASSWORD: 24 * 60 * 60 * 1000,

    // Setting this to `true` makes it possible for anyone to create an account.
    // This must be set to `true` when running the tests
    CREATE_ACCOUNTS_WITHOUT_CREDENTIALS: true,

    // Should cross-origin requests be allowed
    ALLOW_CORS: true
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
    from: 'noreply@example.com',

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

  // Account IDs are based on email adresses
  // ---------------------------------------

  // Documentation of the hash function used is found here:
  // http://nodejs.org/api/crypto.html
  c.ACCOUNT_ID = {

    // a secret salt used when generating the account ids
    // can for instance be generated like this: `openssl rand -base64 32`
    SECRET_SALT: 'MnS3FQfXIbtMrvT6Y1zboNHLkiX/hui0NVqcR33EoQs=',

    // Algorithm used to create account ids. 'sha1', 'md5', 'sha256', 'sha512',
    // etc. `openssl list-message-digest-algorithms` will display the available
    // digest algorithms
    HASH_ALG: 'sha1',

    // 'utf8', 'ascii' or 'binary'
    HASH_ENCODING: 'hex'
  };

  // RDBMS (MySQL and MSSQL) configuration
  // ------------------------------------

  // These credentials are use to create new users. It can for instance be
  // the admin/root user, or you can also create a new user with  exactly
  // the needed priviledges (for extra security)
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

  // dtrace setup
  // -------------
  // See [DTRACE.md](../tests/DTRACE.md) for more information.

  c.enableDtrace = true;


  // Exports
  // =======

  module.exports = c;

})(this);
