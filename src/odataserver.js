// odataserver.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Simple OData server on top of MySQL.
//
//
// Using Google JavaScript Style Guide
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

(function(moduleSelf, undefined) {

  var h = require('./helpers.js');
  var CONFIG = require('./config.js');
  var log = new h.log0(CONFIG.odataServerLoggerOptions);
  var StringDecoder = require('string_decoder').StringDecoder;

  var u = require('underscore');
  var nodemailer = require('nodemailer');

  var Rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);

  // Default no of rows to return
  var defaultRowCount = CONFIG.ODATA.DEFAULT_ROW_COUNT;

  // check for admin operations, where the url start with /s/...
  var urlAdminOps = ['create_account', 'reset_password', 'delete_account',
    'create_table', 'service_def', 'grant', 'revoke', 'drop_table'
  ];

  // These operations require admin/root privs in the db
  var adminCredentialOps = ['create_account', 'reset_password',
    'delete_account', 'service_def'
  ];

  // Check if operation is a valid admin operation
  exports.isAdminOp = function(op) {
    return urlAdminOps.indexOf(op) !== -1;
  };

  //
  // Parse OData URI
  // ================

  //
  // Translate OData filter to SQL where expression
  // ----------------------------------------------
  //
  // http://www.odata.org/documentation/odata-version-2-0/uri-conventions
  //
  // |Operator    |Description     |Example
  // |------------|----------------|------------------------------------------------|
  // |Logical Operators|           |                                                |
  // |Eq          |Equal           |/Suppliers?$filter=Address/City eq ‘Redmond’    |
  // |Ne          |Not equal       |/Suppliers?$filter=Address/City ne ‘London’     |
  // |Gt          |Greater than    |/Products?$filter=Price gt 20                   |
  // |Ge          |Greater than or equal|/Products?$filter=Price ge 10              |
  // |Lt          |Less than       |/Products?$filter=Price lt 20                   |
  // |Le          |Less than or equal|/Products?$filter=Price le 100                |
  // |And         |Logical and     |/Products?$filter=Price le 200 and Price gt 3.5 |
  // |Or          |Logical or      |/Products?$filter=Price le 3.5 or Price gt 200  |
  // |Not         |Logical negation|/Products?$filter=not endswith(Description,’milk’)|
  // |Arithmetic Operators|        |                                               |
  // |Add         |Addition        |/Products?$filter=Price add 5 gt 10            |
  // |Sub         |Subtraction     |/Products?$filter=Price sub 5 gt 10            |
  // |Mul         |Multiplication  |/Products?$filter=Price mul 2 gt 2000          |
  // |Div         |Division        |/Products?$filter=Price div 2 gt 4             |
  // |Mod         |Modulo          |/Products?$filter=Price mod 2 eq 0             |
  // |Grouping Operators|          |                                               |
  // [( )         |Precedence grouping|/Products?$filter=(Price sub 5) gt 10        |
  //
  //
  // http://dev.mysql.com/doc/refman/5.7/en/expressions.html
  //
  // expr:
  //    expr OR expr
  //  | expr || expr
  //  | expr XOR expr
  //  | expr AND expr
  //  | expr && expr
  //  | NOT expr
  //  | ! expr
  //  | boolean_primary IS [NOT] {TRUE | FALSE | UNKNOWN}
  //  | boolean_primary
  //
  // boolean_primary:
  //   boolean_primary IS [NOT] NULL
  //  | boolean_primary <=> predicate
  //  | boolean_primary comparison_operator predicate
  //  | boolean_primary comparison_operator {ALL | ANY} (subquery)
  //  | predicate
  //
  // comparison_operator: = | >= | > | <= | < | <> | !=

  // translate Odata filter operators to sql operators
  // string not matched are just returned
  var translateOp = function(s) {

    // the supported operators
    var op = [];
    op['eq'] = '=';
    op['ne'] = '<>';
    op['gt'] = '>';
    op['ge'] = '>=';
    op['lt'] = '<';
    op['le'] = '<=';
    op['and'] = 'and';
    op['or'] = 'or';
    op['not'] = 'not';
    op['add'] = '+';
    op['sub'] = '-';
    op['mul'] = '*';
    op['div'] = '/';
    op['mod'] = 'mod';

    return (op[s.toLowerCase()] !== undefined) ? op[s.toLowerCase()] : s;
  };

  // take a string with a filter expresssion and translate into a SQL expression
  var filter2where = function(expr) {

    // check for functions and groupings. These are not supported.
    if (expr.indexOf('(') > -1) {
      throw new Error('Functions and groupings are not supported: ' + expr);
    }

    // remove multiple spaces
    expr = expr.replace(/\s{2,}/g, ' ');

    // create array of tokens
    expr = expr.split(' ');

    // translate operators and create a string
    return u.map(expr, translateOp).join(' ');
  };

  //
  // Parse Query strings
  // -------------------
  //
  // Supported:
  //
  // * $orderby= col[ asc|desc] - SQL: order by
  // * $filter=... - SQL: where clause
  // * $skip=N - $orderby must supplied for the result to be reliable
  // * $select=col,col - columns in the select
  //
  // Not supported:
  //
  // * $top
  // * $inlinecount
  // * $expand
  // * $format - use http header
  //
  //
  // MySQL Reference
  // ---------------
  //
  // http://dev.mysql.com/doc/refman/5.7/en/select.html
  //
  // 1.SELECT
  //     [ALL | DISTINCT | DISTINCTROW ]
  //       [HIGH_PRIORITY]
  //       [MAX_STATEMENT_TIME]
  //       [STRAIGHT_JOIN]
  //       [SQL_SMALL_RESULT] [SQL_BIG_RESULT] [SQL_BUFFER_RESULT]
  //       [SQL_CACHE | SQL_NO_CACHE] [SQL_CALC_FOUND_ROWS]
  //     select_expr [, select_expr ...]
  // 2.  [FROM table_references
  //       [PARTITION partition_list]
  // 3.  [WHERE where_condition]
  // 4.  [GROUP BY {col_name | expr | position}
  //       [ASC | DESC], ... [WITH ROLLUP]]
  // 5.  [HAVING where_condition]
  // 6.  [ORDER BY {col_name | expr | position}
  //       [ASC | DESC], ...]
  // 7.  [LIMIT {[offset,] row_count | row_count OFFSET offset}]
  // 8.  [PROCEDURE procedure_name(argument_list)]
  // 9.  [INTO OUTFILE 'file_name'
  //       [CHARACTER SET charset_name]
  //       export_options
  //       | INTO DUMPFILE 'file_name'
  //       | INTO var_name [, var_name]]
  //     [FOR UPDATE | LOCK IN SHARE MODE]]
  //

  var odata2sql = function(param, key) {
    switch (key) {
      case '$orderby':
        return {
          id: 6,
          q: ' order by ' + param
        };

      case '$filter':
        return {
          id: 3,
          q: ' where ' + filter2where(param)
        };

      case '$skip':
        return {
          id: 7,
          q: ' limit ' + param + ',' + defaultRowCount
        };

      case '$select':
        return {
          id: 1,
          q: 'select ' + param
        };

      case '$top':
        throw Error('Unsupported query: ' + key);

      case '$inlinecount':
        throw Error('Unsupported query: ' + key);

      case '$expand':
        throw Error('Unsupported query: ' + key);

      case '$format':
        throw Error('Use http header to select format!');

      default:
        throw Error('Invalid query: ' + key);
    }
  };

  //
  // Convert URI to SQL
  // ==================

  var reduce = function(sqlObjects) {
    // create a string from the objects
    return u.reduce(
      sqlObjects,
      function(memo, o) {
        return memo + o.q;
      },
      "");

  };

  // Just an empty constructor
  exports.ODataUri2Sql = function() {
    var self = this;
  };


  //
  // parse URI using a simple BNF grammar
  //
  // ```
  // slash ('/'') is the delimiter for tokens
  //
  // URI like: /help
  // <method,uri>        ::= basic_uri
  //                     |   system_uri
  //                     |   table_uri
  //
  // <method,basic_uri>  ::= <GET,'help'>
  //                     |  <POST,'create_account'>
  //
  // URI like /account/s/system_operation
  // <method,system_uri> ::= <POST,variable 's' system_operation> -> [system_operation,account]
  // system_operation    :== 'create_table'
  //                     |   'create_bucket'
  //                     |   'drop_table'
  //                     |   'drop_bucket'
  //                     |   'grant'
  //                     |   'revoke'
  //                     |   'reset_password'
  //                     |   'reset_password' variable            -> [reset_password,account,resetToken]
  //
  // URI like /account/table
  // <method,table_uri>  ::= <GET,variable>             -> [service_def,account]
  //                     |   <GET,variable variable>    -> [select,account,table]
  //                     |   <POST,variable variable>   -> [insert,account,table]
  //                     |   <PUT,variable variable>    -> [update,account,table]
  //                     |   <DELETE,variable variable> -> [delete,account,table]
  //
  // variable            ::= SQL schema or table name
  // ```


  var u = require('underscore');

  var parseUri = function(method, tokens) {
    return parseBasicUri(method, tokens) || parseSystemUri(method, tokens) ||
      parseTableUri(method, tokens);
  }

  // URI like /help and /create_account
  var parseBasicUri = function(method, tokens) {
    if (method === 'GET' && tokens[0] === 'help' &&
      tokens.length === 1) {
      return {
        queryType: 'help'
      };
    }

    if (method === 'POST' && tokens[0] === 'create_account' &&
      tokens.length === 1) {
      return {
        queryType: 'create_account'
      };
    }

    return false;
  }

  // URI like /account/s/create_table
  var parseSystemUri = function(method, tokens) {
    if (method === 'POST' &&
      tokens.length === 3 &&
      tokens[1] === 's' && ['reset_password', 'delete_account', 'create_bucket',
        'drop_bucket', 'create_table', 'grant', 'revoke', 'drop_table'
      ].indexOf(tokens[2]) !== -1) {
      return {
        queryType: tokens[2],
        schema: tokens[0]
      };
    }

    if (method === 'POST' &&
      tokens.length === 4 &&
      tokens[1] === 's' &&
      tokens[2] === 'reset_password') {
      return {
        queryType: tokens[2],
        schema: tokens[0],
        resetToken: tokens[3]
      };
    }

    return false;
  }

  // URI like /account or /account/table, tokens = [account,table]
  var parseTableUri = function(method, tokens) {
    if (method === 'GET' && tokens.length === 1) {
      return {
        queryType: 'service_def',
        schema: tokens[0]
      };
    }

    if (method === 'GET' && tokens.length === 2) {
      return {
        queryType: 'select',
        schema: tokens[0],
        table: tokens[1]
      };
    }

    if (method === 'POST' && tokens.length === 2) {
      return {
        queryType: 'insert',
        schema: tokens[0],
        table: tokens[1]
      };
    }

    if (method === 'PUT' && tokens.length === 2) {
      return {
        queryType: 'update',
        schema: tokens[0],
        table: tokens[1]
      };
    }

    if (method === 'DELETE' && tokens.length === 2) {
      return {
        queryType: 'delete',
        schema: tokens[0],
        table: tokens[1]
      };
    }

    return false;

  }

  exports.ODataUri2Sql.prototype.parseUri2 = function(method, inputUri) {
    var url = require('url');
    var parsedUri_ = url.parse(inputUri, true, false);

    // get the schema and table name
    var a_ = parsedUri_.pathname.split("/");

    // drop the first element which is an empty string
    var tokens_ = a_.splice(1, a_.length);

    return parseUri(method, tokens_);
  }

  // parse the uri and create a JSON object. The where_sql property is used
  // for select and delete statements.
  //
  // {
  //   schema: xxx,
  //   table: yyy,
  //   queryType: service_def | create_table | delete_table | select | insert | delete,
  //   sql: 'select col1, col2, colN from table where col1="YY"'
  // }
  //
  // ```
  // Typical URLs: / accountId / s     / reset_password/reset_token
  //                  a[1]       a[2]        a[3]           a[4]
  //               / accountId / table ? ...
  //                  a[1]       a[2]              NOTE: a[0] contains ''
  // ```
  exports.ODataUri2Sql.prototype.parseUri = function(s, reqMethod) {
    var url = require('url');
    var parsedURL = url.parse(s, true, false);

    // get the schema and table name
    var a = parsedURL.pathname.split("/");

    log.debug('parsedURL: ' + JSON.stringify(a));

    var result = {
      schema: a[1],
      table: a[2]
    };

    // URL of the form:  /account/s/create_table
    //                    a = ['','account','s','create_table']
    if (a.length === 2) {

      switch (reqMethod) {
        // return list of tables
        case 'GET':
          result.queryType = 'service_def';
          break;

        case 'POST':
          result.queryType = 'create_table';
          break;

        case 'DELETE':
          result.queryType = 'delete_table';
          break;

          // PUT etc. not supported here
        default:
          throw new Error('Operation on /schema not supported for ' +
            reqMethod);
      }

      return result;
    }

    // reset_password is allowed these forms:
    // * POST /s/reset_password - with the accountId as data will mail a link
    // * GET /s/reset_password/<reset_token> - this will return the new password
    if (a[2] === 'reset_password' && a.length === 4) {
      result.queryType = a[2];
      result.resetToken = a[3];
      return result;
    }

    // URI should look like this: /schema/table
    if (a.length != 3) {
      throw new Error('Pathname should be in the form /schema/table, not ' +
        parsedURL.pathname);
    }

    // Handle admin operations: /s/...
    if (a[1] === CONFIG.SYS_PATH && urlAdminOps.indexOf(a[2]) !== -1) {
      result.queryType = a[2];
      return result;
    }

    // indexing with table(x) not supported
    if (result.table.indexOf('(') > -1) {
      throw new Error('The form /schema/entity(key) is not supported.' +
        ' Use $filter instead.');
    }

    // translate odata queries in URI to sql
    var sqlObjects = u.map(parsedURL.query, odata2sql);

    // parse GET requests
    if (reqMethod == 'GET') {

      // this is a select
      result.queryType = 'select';

      sqlObjects.push({
        id: 2,
        q: ' from ' + result.schema + '.' + result.table
      });

      // sort the query objects according to the sql specification
      sqlObjects = u.sortBy(sqlObjects, function(o) {
        return o.id;
      });

      // add select * if there is no $select
      if (sqlObjects[0].id != 1) {
        sqlObjects.push({
          id: 1,
          q: 'select *'
        });
      }
    }

    // parse POST requests
    if (reqMethod == 'POST') {

      // this is a insert
      result.queryType = 'insert';

      // check that there are no parameters
      if (!u.isEmpty(parsedURL.query)) {
        throw new Error('Parameters are not supported in POST: ' +
          JSON.stringify(parsedURL.query));
      }

    }

    // parse DELETE request
    if (reqMethod == 'DELETE') {

      // this is a delete
      result.queryType = 'delete';

    }

    // sort the query objects according to the sql specification
    sqlObjects = u.sortBy(sqlObjects, function(o) {
      return o.id;
    });

    // create a string from the objects
    result.sql = u.reduce(
      sqlObjects,
      function(memo, o) {
        return memo + o.q;
      },
      "");

    return result;

  };

  // calculate the MD5 etag for a JSON object
  var etag = function(obj) {
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');

    for (var key in obj) {
      md5.update('' + obj[key]);
    }

    return md5.digest('hex');
  };

  // Add an etag property to an object
  exports.ODataUri2Sql.prototype.addEtag = function(obj) {
    // return a clone
    var o = u.clone(obj);
    var e = etag(obj);

    o['@odata.etag'] = e;

    return o;
  };

  //
  // ODataServer Operations
  // =======================
  //
  //  requires root credentials:
  //
  //  * create user (account) (POST /createAccount data={email=...})
  //  * reset password for user (POST /resetPassword data={email=...})
  //  * delete user (DELETE /deleteAccount data={accountID=...} )
  //  * get service definition (table definition)
  //
  //  Using account credentials:
  //
  //  * grant privs to user (POST /privileges data={accountID=..., entity=...} )
  //  * revoke privs from user (DELETE /privileges data={accountID=..., entity=...} ))
  //  * create table
  //  * drop table
  //  * CRUD operations
  //

  // Some helpers used for resetting passwords
  // -----------------------------------------
  //

  var generateUUID = function() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
      function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
      });
    return uuid;
  };

  var mailResetLink = function(email, accountId) {

    // generate random token
    var token = generateUUID();

    // create the resetTokens object if it doesn't exist
    moduleSelf.resetTokens = moduleSelf.resetTokens || {};

    // save the Token
    moduleSelf.resetTokens[token] = {
      accountId: accountId,
      timeStamp: Date.now()
    };

    log.debug('Saved reset token: ' + token + ' - ' +
      JSON.stringify(moduleSelf.resetTokens[token]));

    // The link that is used to reset a password
    var resetLink = 'http://' + CONFIG.ODATA.HOST + ':' +
      CONFIG.ODATA.PORT + '/' + CONFIG.ODATA.SYS_PATH + '/reset_password/' +
      token;

    // create transporter object using SMTP transport
    var transporter = nodemailer.createTransport(CONFIG.nodeMailerOptions);

    // email data
    var mailOptions = u.clone(CONFIG.MAIL_OPTIONS);
    mailOptions.to = email;
    mailOptions.text += resetLink;
    mailOptions.html += resetLink;

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        log.log(error);
      } else {
        log.debug('Mail reset link to ' + email +
          '. SMTP Server reply: ' + info.response);
      }
    });
  }

  var getAccountIdFromToken = function(token) {
    if (moduleSelf.resetTokens[token] === undefined ||
      moduleSelf.resetTokens[token] === null) {
      throw new Error('Invalid reset password token.');
    }

    if (Date.now() - moduleSelf.resetTokens[token].timeStamp >
      CONFIG.ODATA.EXPIRE_RESET_PASSWORD) {
      throw new Error('Reset password token has expired.');
    }

    log.debug('Retrieving accountId from token: ' + token + ' - ' +
      JSON.stringify(moduleSelf.resetTokens[token]));

    var accountId = moduleSelf.resetTokens[token].accountId;

    // The token can only be used once
    moduleSelf.resetTokens[token] = null;

    return accountId;
  }

  // ODataServer object
  // -------------------
  //

  // empty constructor
  exports.ODataServer = function() {
    log.debug('new ODataServer');
  };

  // HTTP REST Server that
  exports.ODataServer.prototype.main = function(request, response) {
    log.debug('In main ...');

    var uriParser = new exports.ODataUri2Sql();

    // Parse the URI and write any errors back to the client
    try {
      var odataRequest = uriParser.parseUri2(request.url, request.method);
      log.debug('odataRequest' + JSON.stringify(odataRequest));
    } catch (e) {
      h.writeError(response, e);
      return;
    }

    // Check that the MySQL credentials have been supplied, not required when
    // creating a new account or resetting password
    if (odataRequest.queryType != 'create_account' &&
      odataRequest.queryType != 'reset_password' &&
      !h.checkCredentials(request, response)) {

      h.writeError(response,
        "Invalid credentials, user or password missing. " +
        "URL: " + request.url +
        ", headers: " + JSON.stringify(request.headers) + " TYPE:" +
        odataRequest.queryType);

      return;
    }

    // save input from POST and PUT here
    var data = '';

    request
    // read the data in the stream, if there is any
      .on('error', function(err) {

      var str = "Error in http input stream: " + err +
        ", URL: " + request.url +
        ", headers: " + JSON.stringify(request.headers) + " TYPE:" +
        odataRequest.queryType;

      log.log(str);
      h.writeError(response, str);
    })

    // read the data in the stream, if there is any
    .on('data', function(chunk) {
      log.debug('Receiving data');
      data += chunk;
    })

    // request closed,
    .on('close', function() {
      log.debug('http request closed.');
    })

    // request closed, process it
    .on('end', function() {

      log.debug('End of data');

      try {

        // parse odata payload into JSON object
        var jsonData = null;
        if (data !== '') {
          jsonData = h.jsonParse(data);
          log.debug('Data received: ' + JSON.stringify(jsonData));
        }

        var mysqlAdmin;
        var accountId = request.headers.user;
        var password = request.headers.password;

        var options = {
          credentials: {
            database: accountId,
            user: accountId,
            password: password
          },
          closeStream: true
        };

        var adminOptions = {
          credentials: {
            user: CONFIG.RDBMS.ADMIN_USER,
            password: CONFIG.RDBMS.ADMIN_PASSWORD
          },
          closeStream: true
        };

        log.debug('Processing request - credentials: ' +
          JSON.stringify(options) +
          ', odataRequest: ' + JSON.stringify(odataRequest) +
          ', JSON: ' + JSON.stringify(jsonData));

        // queryType: create_user | set_password | delete_user
        // queryType: service_def | create_table | delete_table | select | insert | delete,

        var decoder = new StringDecoder('utf8');
        var bucket = new h.arrayBucketStream();
        var odataResult = {};

        // operations performed with admin/root credentials
        if (adminCredentialOps.indexOf(odataRequest.queryType) !== -1) {

          log.debug('Performing operation ' + odataRequest.queryType +
            ' with admin/root credentials');
          log.debug('odataRequest: ' + JSON.stringify(odataRequest));

          sqlAdmin = new Rdbms.sqlAdmin(adminOptions);

          var email = '';
          if (odataRequest.queryType === 'create_account') {
            // calculate accountId from email
            accountId = h.email2accountId(jsonData.email);
            email = jsonData.email;
            sqlAdmin.new(accountId);
          }

          var password;
          if (odataRequest.queryType === 'reset_password') {

            // mail a reset password link
            if (odataRequest.resetToken === undefined) {

              // Make sure the mail is sent to the right address
              if (h.email2accountId(jsonData.email) !== jsonData.accountId) {
                h.writeError(response, 'Incorrect reset_password request');
              }

              log.debug('Mail reset password link.');
              mailResetLink(jsonData.email, jsonData.accountId);

              // NOTE: allow to reset password without link, used for testing
              if (!CONFIG.TEST.RESET_PASSWORD_WITHOUT_LINK) {
                h.writeResponse(response, {
                  message: 'Check your mail!'
                });
                return;
              }
            } else {
              jsonData = jsonData || {};
              jsonData.accountId =
                getAccountIdFromToken(odataRequest.resetToken);
            }

            password = sqlAdmin.resetPassword(jsonData.accountId);
          }

          if (odataRequest.queryType === 'delete_account') {
            sqlAdmin.delete(accountId);
          }

          if (odataRequest.queryType === 'service_def') {
            sqlAdmin.serviceDef(accountId);
          }

          sqlAdmin.pipe(bucket,
            function() {
              odataResult.email = email;
              odataResult.accountId = accountId;

              if (odataRequest.queryType === 'reset_password') {
                odataResult.password = password;
              }

              // The RDBMS response is JSON but it is not parsed since that
              // sometimes fails (reason unknown)
              odataResult.rdbmsResponse = decoder.write(bucket.get());

              h.writeResponse(response, odataResult);
            },
            function(err) {
              h.writeError(response, err);
            }
          );

          return;

        }

        log.debug('Performing operation ' + odataRequest.queryType +
          ' with ' + accountId + ' credentials');
        odataResult.accountId = accountId;

        // operations performed with objects inheriting from the the rdbms base object
        if (['grant', 'revoke', 'create_table', 'delete_table',
            'delete'
          ].indexOf(odataRequest.queryType) !== -1) {

          var rdbms;

          if (odataRequest.queryType === 'grant') {
            rdbms = new Rdbms.sqlAdmin(options);
            rdbms.grant(jsonData.tableName, jsonData.accountId);
          }

          if (odataRequest.queryType === 'revoke') {
            rdbms = new Rdbms.sqlAdmin(options);
            rdbms.revoke(jsonData.tableName, jsonData.accountId);
          }

          if (odataRequest.queryType === 'create_table') {
            options.tableDef = jsonData.tableDef;
            rdbms = new Rdbms.sqlCreate(options);
          }

          if (odataRequest.queryType === 'delete_table') {
            options.tableName = jsonData.tableName;
            rdbms = new Rdbms.sqlDrop(options);
          }

          if (odataRequest.queryType === 'delete') {
            options.tableName = odataRequest.table;
            options.where = odataRequest.where;
            rdbms = new Rdbms.sqlDelete(options);
          }

          rdbms.pipe(bucket,
            function() {
              odataResult.rdbmsResponse = decoder.write(bucket.get());
              h.writeResponse(response, odataResult);
            },
            function(err) {
              h.writeError(response, err);
            }
          );

          return;
        }

        // Handle select, insert and unknow query types
        switch (odataRequest.queryType) {

          case 'select':
            options.sql = odataRequest.sql;
            options.processRowFunc = h.addEtag;
            log.debug('Pipe values of the mysql stream to the response ' +
              '- options: ' +
              JSON.stringify(options));
            var mysqlRead = new Rdbms.sqlRead(options);
            mysqlRead.fetchAll(function(res) {
              odataResult.value = res;
              h.writeResponse(response, odataResult);
            });
            break;

            // NOTE: Could move this out of end event and pipe request into mysql
          case 'insert':
            options.tableName = odataRequest.table;
            options.resultStream = bucket;
            var writeStream = new Rdbms.sqlWriteStream(options,
              function() {
                odataResult.rdbmsResponse = decoder.write(bucket.get());
                h.writeResponse(response, odataResult);
              }
            );

            // create stream that writes json into rdbms
            var jsonStream = new require('stream');
            jsonStream.pipe = function(dest) {
              dest.write(JSON.stringify(jsonData));
            };

            jsonStream.pipe(writeStream);
            break;

          default:
            h.writeError(response, 'Error, unknown queryType: ' +
              odataRequest.queryType);
        }

      } catch (e) {
        h.writeError(response, e);
      }

    });

  };

})(this);
