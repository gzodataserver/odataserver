// config.js
// ------------
//
// 2014-11-15, Jonas Colmsjö
// -------------------------
//
// The configuration is saved in the global variable `CONFIG`
// Defaults will be used for all settings not provided.
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

var util = require('util');
var h = require('./helpers.js');

config = function(conf) {
  h.merge(defaults, conf);
  return conf;
};

// OData server configuration
// --------------------------
//

var defaults = {};

defaults.ODATA = {
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

defaults.nodeMailerOptions = {
  service: 'Gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
};

defaults.MAIL_OPTIONS = {
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

// RDBMS (MySQL and MSSQL) configuration
// ------------------------------------

// These credentials are use to create new users. It can for instance be
// the admin/root user, or you can also create a new user with  exactly
// the needed priviledges (for extra security)
defaults.RDBMS = {

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

// Exports
// =======

module.exports = config;
