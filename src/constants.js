//
// constants.js
//



var util = require('util');

var c = {};

// OData server configuration
// --------------------------
//

c.ODATA = {
  // Make sure that the RDBMS backend works like sqlBase.js outlines if you
  // change this
  RDBMS_BACKEND: './mysql.js',

  // Make sure that the bucket backend works like leveldb.js if you change
  // this
  BUCKET_BACKEND: './leveldb.js',

  // The prefix used in the name of buckets
  HELP_FILE: './Usage.md',
};

// HTTPS settings
// -------------------------
//

c.HTTPS_OPTIONS = {
  USE_HTTPS: false,
  KEY_FILE: './server.key',
  CERT_FILE: './server.cer'
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

// Logging setup
// -------------

// The `#` before `test_XXX` is necessary for the tests to comply with the
// TAP protocol
//
// leave debug: true below and control the logging by setting the environment
// variable NODE_DEBUG=debugtest,... instead (see setenv.template)
//

c.testLoggerOptions = {
  debug: true,
  filename: '# test_XXX.js',
  noLogging: false,
  debuglog: util.debuglog('debugtest')
};

// NOTE: should turn logging on in production. Turned off here in order for
// the tests output to comply with the TAP protocol
c.mysqlLoggerOptions = {
  debug: true,
  filename: 'mysql.js',
  noLogging: false,
  debuglog: util.debuglog('debugmysql')
};

c.leveldbLoggerOptions = {
  debug: true,
  filename: 'leveldb.js',
  noLogging: false,
  debuglog: util.debuglog('debugleveldb')
};

c.odataServerLoggerOptions = {
  debug: true,
  filename: 'odataserver.js',
  noLogging: false,
  debuglog: util.debuglog('debugodata')
};

c.mainLoggerOptions = {
  debug: true,
  filename: 'main.js',
  noLogging: false,
  debuglog: util.debuglog('debugmain')

};

// dtrace setup
// -------------
// See [DTRACE.md](../tests/DTRACE.md) for more information.

c.enableDtrace = true;

// Too Busy setup
// -------------
// Experimental - the RDBMS is likely the bottleneck, not this NodeJS process!
//
// The server will respond inidicating that it is too busy in order to keep
// the response times. NOTE: Using tooBusy will prevent the tests from
// completing (a timer is running in the event loop)

c.enableTooBusy = false;


// Exports
// =======

module.exports = c;
