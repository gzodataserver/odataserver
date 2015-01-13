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

(function(self_, undefined) {

  var h = require('./helpers.js');
  var CONFIG = require('./config.js');
  var log = new h.log0(CONFIG.odataServerLoggerOptions);
  var StringDecoder = require('string_decoder').StringDecoder;

  var u = require('underscore');

  // Default no of rows to return
  var defaultRowCount = CONFIG.ODATA.DEFAULT_ROW_COUNT;

  // check for admin operations
  var urlAdminOps = ['create_account', 'reset_password', 'delete_account',
  'create_table', 'service_def', 'create_privs', 'drop_table', 'create_bucket',
  'drop_bucket' ];

  // These operations require admin/root privs in the db
  var adminCredentialOps = ['create_account', 'reset_password', 'delete_account',
   'service_def' ];

  // These operations are performed with the sqlAdmin object
  //var sqlAdminOps = ['create_account', 'reset_password', 'delete_account',
  //, 'service_def', 'create_privs' ];


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
  // Parse OData  URI
  // ====================


  var reduce = function(sqlObjects) {
    // create a string from the objects
    return u.reduce(
      sqlObjects,
      function(memo, o) {
        return memo + o.q;
      },
      "");

  };

  // Just en empty constructor
  exports.ODataUri2Sql = function() {
    var self = this;
  };

  // parse the uri and create a JSON object. The where_sql property is used
  // for select and delete statements.
  //
  // {
  //   schema: xxx,
  //   table: yyy,
  //   query_type: service_def | create_table | delete_table | select | insert | delete,
  //   sql: 'select col1, col2, colN from table where col1="YY"'
  // }
  //
  exports.ODataUri2Sql.prototype.parseUri = function(s, req_method) {
    var url = require('url');
    var parsedURL = url.parse(s, true, false);

    // get the schema and table name
    var a = parsedURL.pathname.split("/");

    var result = {
      schema: a[1],
      table: a[2]
    };

    // Work on service definition, e.g. list of tables, for /schema/
    if (a.length == 2) {

      switch (req_method) {
        // return list of tables
        case 'GET':
          result.query_type = 'service_def';
          break;

        case 'POST':
          result.query_type = 'create_table';
          break;

        case 'DELETE':
          result.query_type = 'delete_table';
          break;

          // POST etc. not supported here
        default:
          throw new Error('Operation on /schema not supported for ' + req_method);
      }

      return result;
    }

    // URI should look like this: /schema/table
    if (a.length != 3) {
      throw new Error('Pathname should be in the form /schema/table, not ' + parsedURL.pathname);
    }


    if(urlAdminOps.indexOf(a[2]) !== -1 ) {
      result.query_type = a[2];
      return result;
    }

    // indexing with table(x) not supported
    if (result.table.indexOf('(') > -1) {
      throw new Error('The form /schema/entity(key) is not supported. Use $filter instead.');
    }


    // translate odata queries in URI to sql
    var sqlObjects = u.map(parsedURL.query, odata2sql);

    // parse GET requests
    if (req_method == 'GET') {

      // this is a select
      result.query_type = 'select';

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
    if (req_method == 'POST') {

      // this is a insert
      result.query_type = 'insert';

      // check that there are no parameters
      if (!u.isEmpty(parsedURL.query)) {
        throw new Error('Parameters are not supported in POST: ' +
          JSON.stringify(parsedURL.query));
      }

    }

    // parse DELETE request
    if (req_method == 'DELETE') {

      // this is a delete
      result.query_type = 'delete';

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
    var crypto = require('crypto'),
      md5 = crypto.createHash('md5');

    for (var key in obj) {
      md5.update('' + obj[key]);
    }

    return md5.digest('hex');
  };

  // Add an etag property to an object
  exports.ODataUri2Sql.prototype.addEtag = function(obj) {
    // return a clone
    var o = u.clone(obj),
      e = etag(obj);

    o['@odata.etag'] = e;

    return o;
  };


  //
  // Operations
  // -----------
  //
  //  requires root credentials: THESE HAVE NOT BEEN IMPLMENTED IN PARSEUR!!!
  //
  //  * create user (account) (POST /createAccount data={email=...})
  //  * reset password for user (POST /resetPassword data={email=...})
  //  * delete user (DELETE /deleteAccount data={accountID=...} )
  //
  //  Using account credentials:
  //
  //  * grant privs to user (POST /privileges data={accountID=..., entity=...} )
  //  * revoke privs from user (DELETE /privileges data={accountID=..., entity=...} ))
  //  * create table
  //  * drop table
  //  * get service definition (table definition)
  //  * CRUD operations
  //

  // empty constructor
  exports.ODataServer = function() {
    log.debug('new ODataServer');
  };

  // HTTP REST Server that
  exports.ODataServer.prototype.main = function(request, response, odataBackend) {
    log.debug('In main ...');


    // Parse the Uri
    var uriParser = new exports.ODataUri2Sql();
    var odataRequest = uriParser.parseUri(request.url, request.method);

    // Check the MySQL credentials have been supplied, not required when
    // creating a new account ore resetting password though
    if (odataRequest.query_type != 'create_account' &&
        odataRequest.query_type != 'reset_password' &&
        !h.checkCredentials(request, response)) {

      h.writeError(response, "Invalid credentials, user or password missing. "+
                           "URL: "+request.url+
                           ", headers: "+JSON.stringify(request.headers) + " TYPE:"+odataRequest.query_type);

      return;
    }

    // Only GET, POST, PUT and DELTE supported
    if (!(request.method == 'GET' ||
        request.method == 'POST' ||
        request.method == 'DELETE')) {

      h.writeError(response, request.method + ' not supported.');
    }

    // save input from POST and PUT here
    var data = '';


    request
      // read the data in the stream, if there is any
      .on('error', function(err) {

        var str ="Error in http input stream: "+err+
          ", URL: "+request.url+
          ", headers: "+JSON.stringify(request.headers) + " TYPE:"+odataRequest.query_type;

        log.log(str);
        writeError(response, str);
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
            log.debug('Data received: ' + JSON.stringify(jsonData) );
          }

          var mysqlAdmin,
            accountId = request.headers.user,
            password = request.headers.password;


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


          log.debug('Processing request - credentials: '+JSON.stringify(options)+
                      ', odataRequest: '+JSON.stringify(odataRequest) +
                      ', JSON: '+JSON.stringify(jsonData));

          // query_type: create_user | set_password | delete_user
          // query_type: service_def | create_table | delete_table | select | insert | delete,

          var decoder = new StringDecoder('utf8');
          var bucket = new h.arrayBucketStream();
          var odataResult = {};

          // operations performed with admin/root credentials
          if( adminCredentialOps.indexOf(odataRequest.query_type) !== -1) {

            log.debug('Performing operation '+odataRequest.query_type+' with admin/root credentials');
            log.debug('odataRequest: '+JSON.stringify(odataRequest));

             mysqlAdmin = new odataBackend.sqlAdmin(adminOptions);

            var email = '';
            if (odataRequest.query_type === 'create_account') {
              // calculate accountId from email
              accountId = h.email2accountId(jsonData.email);
              email = jsonData.email;
              mysqlAdmin.new(accountId);
            }

            var password;
            if (odataRequest.query_type === 'reset_password') {
              password = mysqlAdmin.resetPassword(jsonData.accountId);
            }

            if (odataRequest.query_type === 'delete_account') {
              mysqlAdmin.delete(accountId);
            }

            if (odataRequest.query_type === 'service_def') {
              mysqlAdmin.serviceDef(accountId);
            }

            mysqlAdmin.pipe(bucket,
              function() {
                odataResult.email = email;
                odataResult.accountId = accountId;

                if (odataRequest.query_type === 'reset_password')
                  odataResult.password = password;

                // The RDBMS response is JSON but it is not parsed since that
                // sometimes fails (reason unknown)
                odataResult.rdbms_response = decoder.write(bucket.get());

                h.writeResponse(response, odataResult);
              },
              function(err) {
                h.writeError(response, err);
              }
            );

            return;

          }

          log.debug('Performing operation '+odataRequest.query_type+' with '+accountId+' credentials');
          odataResult.accountId = accountId;

          // operations performed with objects inheriting from the the rdbms base object
          if( ['grant', 'create_table', 'delete_table', 'delete'].indexOf(odataRequest.query_type) !== -1) {

            var rdbms;

            if (odataRequest.query_type === 'grant') {
              rdbms = new odataBackend.sqlAdmin(options);
              rdbms.grant('table1', accountId2);
            }

            if (odataRequest.query_type === 'create_table') {
              options.tableDef = jsonData.tableDef;
              rdbms = new odataBackend.sqlCreate(options);
            }

            if (odataRequest.query_type === 'delete_table') {
              options.tableName = jsonData.tableName;
              rdbms = new odataBackend.sqlDrop(options);
            }

            if (odataRequest.query_type === 'delete') {
              options.tableName = odataRequest.table;
              options.where = odataRequest.where;
              rdbms = new odataBackend.sqlDelete(options);
            }

            rdbms.pipe(bucket,
              function() {
                odataResult.rdbms_response = decoder.write(bucket.get());
                h.writeResponse(response, odataResult);
              },
              function(err) {
                h.writeError(response, err);
              }
            );

            return;
          }


          // Handle select, insert and unknow query types
          switch (odataRequest.query_type) {

            case 'select':
              options.sql = odataRequest.sql;
              options.processRowFunc = h.addEtag;
              log.debug('Pipe values of the mysql stream to the response - options: '+
                          JSON.stringify(options));
              var mysqlRead = new odataBackend.sqlRead(options);
              mysqlRead.fetchAll(function(res){
                odataResult.value = res;
                h.writeResponse(response, odataResult);
              });
              break;

            // NOTE: Could move this out of end event and pipe request into mysql
            case 'insert':
              options.tableName = odataRequest.table;
              options.resultStream = bucket;
              options.closeStream = true;
              var writeStream = new odataBackend.sqlWriteStream(options,
                function() {
                  odataResult.rdbms_response = decoder.write(bucket.get());
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
              h.writeError(response, 'Error, unknown query_type: ' + odataRequest.query_type);
          }

        } catch (e) {
          h.writeError(response, e);
        }


      });

  };

})(this);
