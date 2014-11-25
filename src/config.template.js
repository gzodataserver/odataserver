//
// config.js
//

(function(self_, undefined) {


  var c = self_.config || {};

  // Account IDs are based email adresses
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
    ADMIN_USER: 'root',

    // MySQL admin/root password
    ADMIN_PASSWORD: 'XXX'

  };


  // MSSQL configuration
  // -------------------

  // These credentials are use to create new users. It can for instance use
  // the sysadmin role, or you can also create a new user/role with only exactly
  // the needed priviledges for extra security
  c.MSSQL = {

    // MySQL admin/root username
    ADMIN_USER: 'admin',

    // MySQL admin/root password
    ADMIN_PASSWORD: 'XXX'

  };


  // Exports
  // =======

  module.exports = c;

})(this);
