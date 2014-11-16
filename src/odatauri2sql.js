// odatauri2sql.js
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
  h.debug = true;

  var u = require('underscore');

  // Default no of rows to return
  var defaultRowCount = 100;

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


  exports.ODataUri2Sql.prototype.parseUri = function(s, req_method) {
    var url = require('url');
    var parsedURL = url.parse(s, true, false);
    var query_type, sqlString;

    // translate odata queries in URI to sql
    var sqlObjects = u.map(parsedURL.query, odata2sql);

    // get the schema and table name
    var a = parsedURL.pathname.split("/");

    // Save schema for later use
    var schema = a[1],
      table = a[2];

    // Work on service definition, e.g. list of tables, for /schema/
    if (a.length == 2) {

      // return list of tables
      if (req_method == 'GET') {
        return {
          query_type: 'service_def',
          schema: schema,
          sql: 'select table_name, (data_length+index_length)/1024/1024 as mb from information_schema.tables where table_schema="' + schema + '"'
        };
      }

      if (req_method == 'POST') {
        return {
          query_type: 'create_table',
          schema: schema,
          sql: 'create table '
        };

      }

      // POST, DELETE etc. not supported here
      else {
        throw new Error('Operation on /schema not supported for ' + req_method);
      }
    }

    // URI should look like this: /schema/table
    if (a.length != 3) {
      throw new Error('Pathname should be in the form /schema/table, not ' + parsedURL.pathname);
    }

    // indexing with table(x) not supported
    if (a[2].indexOf('(') > -1) {
      throw new Error('The form /schema/entity(key) is not supported. Use $filter instead.');
    }

    // parse GET requests
    if (req_method == 'GET') {

      // this is a select
      query_type = 'select';

      sqlObjects.push({
        id: 2,
        q: ' from ' + schema + '.' + table
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
        // sort the query objects according to the sql specification
        sqlObjects = u.sortBy(sqlObjects, function(o) {
          return o.id;
        });
      }

      // create a string from the objects
      sqlString = u.reduce(
        sqlObjects,
        function(memo, o) {
          return memo + o.q;
        },
        "");
    }

    // parse POST requests
    if (req_method == 'POST') {

      // this is a insert
      query_type = 'insert';

      // check that there are no parameters
      if (!u.isEmpty(parsedURL.query)) {
        throw new Error('Parameters are not supported in POST: ' + JSON.stringify(parsedURL.query));
      }

      sqlString = 'insert into ' + schema + '.' + table;
    }

    // parse DELETE request
    if (req_method == 'DELETE') {

      // this is a delete
      query_type = 'delete';

      // sort the query objects according to the sql specification
      sqlObjects = u.sortBy(sqlObjects, function(o) {
        return o.id;
      });

      // create a string from the objects
      sqlString = 'delete from ' + schema + '.' + table + u.reduce(
        sqlObjects,
        function(memo, o) {
          return memo + o.q;
        },
        "");

    }

    return {
      query_type: query_type,
      schema: schema,
      sql: sqlString
    };

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

})(this);
