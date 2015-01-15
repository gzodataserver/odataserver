// main.js
//------------------------------
//
// 2014-08-11, Jonas Colmsjö
//
//------------------------------
//
// Simple OData server on top of MySQL.
//
//
// Using Google JavaScript Style Guide - http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

//
// Primitive data types in JavaScript and JSON
// -------------------------------------------
//
// JavaScript have six primitive data types, see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
//
// * Boolean
// * Null
// * Undefined
// * Number
// * String
//
// It is only Boolean, Number and Strings that can be mapped to SQL datatypes. Null values can be allowed
// in all columns i a database. Undefined is not applicable to a database.
//
// JSON Schema defines seven primitive types for JSON values, see
// http://json-schema.org/latest/json-schema-core.html#anchor5:
//
// array - A JSON array.
// boolean - A JSON boolean.
// integer - A JSON number without a fraction or exponent part.
// number - Any JSON number. Number includes integer.
// null - The JSON null value.
// object - A JSON object.
// string - A JSON string.
//
//
// MySQL to NodeJs type conversion
// -------------------------------
//
// This is how the NodeJS MySQL driver performs typecasting. See https://github.com/felixge/node-mysql
//
// * Number: TINYINT, SMALLINT, INT, MEDIUMINT, YEAR, FLOAT, DOUBLE
// * Date: TIMESTAMP, DATE, DATETIME
// * Buffer: TINYBLOB, MEDIUMBLOB, LONGBLOB, BLOB, BINARY, VARBINARY, BIT (last byte will be filled with 0 bits as necessary)
// String: CHAR, VARCHAR, TINYTEXT, MEDIUMTEXT, LONGTEXT, TEXT, ENUM, SET, DECIMAL (may exceed float precision), BIGINT (may exceed float precision), TIME (could be mapped to Date, but what date would be set?), GEOMETRY (never used those, get in touch if you do)
//
//
// MySQL table definitions
// -----------------------
//
// This is the format used for defining tables: `{table_name, columns: [create_definition]}`.
//
// It is recommended to stick to the SQL92 standard. This is not enforced though.
//  * The SQL92 standard: http://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt
//  * BNF for SQL92: http://savage.net.au/SQL/index.html
//
// There is no validation of the column_definition, it is simply sent to MySQL and any errors
// sent as the result of the query.
//
// http://dev.mysql.com/doc/refman/5.6/en/create-table.html
//
// CREATE [TEMPORARY] TABLE [IF NOT EXISTS] tbl_name
//     { LIKE old_tbl_name | (LIKE old_tbl_name) }
// create_definition:
//     col_name column_definition
//   | [CONSTRAINT [symbol]] PRIMARY KEY [index_type] (index_col_name,...)
//       [index_option] ...
//   | {INDEX|KEY} [index_name] [index_type] (index_col_name,...)
//       [index_option] ...
//   | [CONSTRAINT [symbol]] UNIQUE [INDEX|KEY]
//       [index_name] [index_type] (index_col_name,...)
//       [index_option] ...
//   | {FULLTEXT|SPATIAL} [INDEX|KEY] [index_name] (index_col_name,...)
//       [index_option] ...
//   | [CONSTRAINT [symbol]] FOREIGN KEY
//       [index_name] (index_col_name,...) reference_definition
//   | CHECK (expr)
//
// column_definition:
//      data_type [NOT NULL | NULL] [DEFAULT default_value]
//       [AUTO_INCREMENT] [UNIQUE [KEY] | [PRIMARY] KEY]
//       [COMMENT 'string']
//       [COLUMN_FORMAT {FIXED|DYNAMIC|DEFAULT}]
//       [STORAGE {DISK|MEMORY|DEFAULT}]
//       [reference_definition]
//
// data_type:
//     BIT[(length)]
//   | TINYINT[(length)] [UNSIGNED] [ZEROFILL]
//   | SMALLINT[(length)] [UNSIGNED] [ZEROFILL]
//   | MEDIUMINT[(length)] [UNSIGNED] [ZEROFILL]
//   | INT[(length)] [UNSIGNED] [ZEROFILL]
//   | INTEGER[(length)] [UNSIGNED] [ZEROFILL]
//   | BIGINT[(length)] [UNSIGNED] [ZEROFILL]
//   | REAL[(length,decimals)] [UNSIGNED] [ZEROFILL]
//   | DOUBLE[(length,decimals)] [UNSIGNED] [ZEROFILL]
//   | FLOAT[(length,decimals)] [UNSIGNED] [ZEROFILL]
//   | DECIMAL[(length[,decimals])] [UNSIGNED] [ZEROFILL]
//   | NUMERIC[(length[,decimals])] [UNSIGNED] [ZEROFILL]
//   | DATE
//   | TIME[(fsp)]
//   | TIMESTAMP[(fsp)]
//   | DATETIME[(fsp)]
//   | YEAR
//   | CHAR[(length)]
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | VARCHAR(length)
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | BINARY[(length)]
//   | VARBINARY(length)
//   | TINYBLOB
//   | BLOB
//   | MEDIUMBLOB
//   | LONGBLOB
//   | TINYTEXT [BINARY]
//     [CHARACTER SET charset_name] [COLLATE collation_name]
//   | TEXT [BINARY]
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | MEDIUMTEXT [BINARY]
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | LONGTEXT [BINARY]
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | ENUM(value1,value2,value3,...)
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//  | SET(value1,value2,value3,...)
//       [CHARACTER SET charset_name] [COLLATE collation_name]
//   | spatial_type
//
// index_col_name:
//     col_name [(length)] [ASC | DESC]
//
// index_type:
//     USING {BTREE | HASH}
//
// index_option:
//     KEY_BLOCK_SIZE [=] value
//   | index_type
//   | WITH PARSER parser_name
//   | COMMENT 'string'
//
// reference_definition:
//     REFERENCES tbl_name (index_col_name,...)
//       [MATCH FULL | MATCH PARTIAL | MATCH SIMPLE]
//       [ON DELETE reference_option]
//       [ON UPDATE reference_option]
//
// reference_option:
//     RESTRICT | CASCADE | SET NULL | NO ACTION

(function (self, undefined) {

    var mos    = self.mysqlodata || {};
    var u      = require('underscore');

    // Default no of rows to return
    var defaultRowCount = 100;
    var defaultPort     = 80;

    // change to false to stop this logging
    var debug        = true,
        info         = true,
        noLogging    = false;


    //
    // Helpers
    // ===================

    var logDebug = function(text) {
        if(debug && !noLogging) console.log('DEBUG: '+text);
    };

    var logInfo = function(text) {
        if(info && !noLogging) console.log('INFO: '+text);
    };

    var log = function(text) {
        if(!noLogging) console.log(text);
    };


    //
    // Parse OData GET URI
    // ===================

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
        op['eq']  = '=';
        op['ne']  = '<>';
        op['gt']  = '>';
        op['ge']  = '>=';
        op['lt']  = '<';
        op['le']  = '<=';
        op['and'] = 'and';
        op['or']  = 'or';
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
        if(expr.indexOf('(') > -1) {
            throw new Error('Functions and groupings are not supported: '+expr);
        }

        // remove multiple spaces
        expr = expr.replace(/\s{2,}/g, ' ');

        // create array of tokens
        expr = expr.split(' ');

        // translate operators and create a string
        return u.map(expr,translateOp).join(' ');
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

    var odata2sql = function (param, key) {
        switch(key)
        {
            case '$orderby':
                return {id:6, q:' order by '+param};
                break;

            case '$filter':
                return {id:3, q:' where '+filter2where(param)};
                break;

            case '$skip':
                return {id:7, q:' limit '+param+','+defaultRowCount};
                break;

            case '$select':
                return {id:1, q:'select '+param};
                break;

            case '$top':
                throw Error('Unsupported query: '+key);
                break;

            case '$inlinecount':
                throw Error('Unsupported query: '+key);
                break;

            case '$expand':
                throw Error('Unsupported query: '+key);
                break;

            case '$format':
                throw Error('Use http header to select format!');
                break;

            default:
                throw Error('Invalid query: '+key);
        }
    };


    //
    // Parse OData  URI
    // ====================


    var reduce = function(sqlObjects) {
        // create a string from the objects
        return u.reduce(
            sqlObjects,
            function(memo,o) {
                return memo+o.q;
            },
            "");

    };

    mos.parseURI = function(s, req_method) {
        var url       = require('url');
        var parsedURL = url.parse(s,true,false);
        var query_type, sqlString;

        // translate odata queries in URI to sql
        var sqlObjects = u.map(parsedURL.query, odata2sql);

        // get the schema and table name
        var a      = parsedURL.pathname.split("/");

        // Save schema for later use
        var schema = a[1],
            table  = a[2];

        // Work on service definition, e.g. list of tables, for /schema/
        if(a.length == 2) {

            // return list of tables
            if(req_method == 'GET') {
                return {query_type: 'service_def', schema:schema,
                  sql:'select table_name, (data_length+index_length)/1024/1024 as mb from information_schema.tables where table_schema="'+ schema + '"'};
            }

            if(req_method == 'POST') {
                return {query_type: 'create_table', schema:schema,
                  sql:'create table '};

            }

            // POST, DELETE etc. not supported here
            else {
                throw new Error('Operation on /schema not supported for '+req_method);
            }
        }

        // URI should look like this: /schema/table
        if(a.length != 3) {
            throw new Error('Pathname should be in the form /schema/table, not '+parsedURL.pathname);
        }

        // indexing with table(x) not supported
        if(a[2].indexOf('(') > -1) {
            throw new Error('The form /schema/entity(key) is not supported. Use $filter instead.');
        }

        // parse GET requests
        if(req_method == 'GET') {

            // this is a select
            query_type = 'select';

            sqlObjects.push({id:2, q:' from '+ schema + '.' + table});

            // sort the query objects according to the sql specification
            sqlObjects = u.sortBy(sqlObjects, function(o) {return o.id;});

            // add select * if there is no $select
            if(sqlObjects[0].id != 1) {
                sqlObjects.push({id:1, q:'select *'});
                // sort the query objects according to the sql specification
                sqlObjects = u.sortBy(sqlObjects, function(o) {return o.id;});
            }

            // create a string from the objects
            sqlString = u.reduce(
                sqlObjects,
                function(memo,o) {
                    return memo+o.q;
                },
                "");
        }

        // parse POST requests
        if(req_method == 'POST') {

            // this is a insert
            query_type = 'insert';

            // check that there are no parameters
            if (!u.isEmpty(parsedURL.query)) {
                throw new Error('Parameters are not supported in POST: '+ JSON.stringify(parsedURL.query));
            }

            sqlString = 'insert into ' + schema + '.' + table;
        }

        // parse DELETE request
        if(req_method == 'DELETE') {

            // this is a delete
            query_type = 'delete';

            // sort the query objects according to the sql specification
            sqlObjects = u.sortBy(sqlObjects, function(o) {return o.id;});

            // create a string from the objects
            sqlString = 'delete from ' + schema + '.' + table + u.reduce(
                sqlObjects,
                function(memo,o) {
                    return memo+o.q;
                },
                "");

        }

        return {query_type: query_type, schema:schema, sql:sqlString};

    };

    //
    // MySQL Functions
    // ==================

    // check that the request contains user and password headers
    var checkCredentials = function(request, response) {

        logDebug('Checking credentials: ' + JSON.stringify(request.headers));

        // Check that the request is ok
        if ( !request.headers.hasOwnProperty('user')  ||
             !request.headers.hasOwnProperty('password') ) {

                writeError(response, "Invalid credentials, user or password missing " +
                                        JSON.stringify(request.headers));
                return false;
        }

        return true;
    };

    // calculate the MD5 etag for a JSON object
    var etag = function(obj) {
        var crypto = require('crypto'),
            md5    = crypto.createHash('md5');

        for (var key in obj) {
            md5.update( ''+obj[key] );
        }

        return md5.digest('hex');
    };

    // Add an etag property to an object
    mos.addEtag = function(obj) {
        // return a clone
        var o = u.clone(obj),
            e = etag(obj);

        o['@odata.etag'] = e;

        return o;
    };

    // Execute select write result to http response
    // sql:{query_type: 'select|insert|service_def', schema:schema, sql:sqlString}
    //
    // MySQL reference
    // --------------
    //
    // http://dev.mysql.com/doc/refman/5.6/en/insert.html
    //
    // INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
    // [INTO] tbl_name
    // [PARTITION (partition_name,...)]
    // [(col_name,...)]
    // {VALUES | VALUE} ({expr | DEFAULT},...),(...),...
    // [ ON DUPLICATE KEY UPDATE
    //   col_name=expr
    //     [, col_name=expr] ... ]
    //
    //
    var prepareInsert = function(sql, data) {

        // separate keys (columns names) and values into separate strings
        // values have quotes but column names don't
        var k = u.keys(data).join(','),
            v = JSON.stringify(u.values(data));

        // Skip [ and ] characters in string
        v = v.substring(1,v.length-1);

        // The insert query
        var insert = sql.sql + '(' + k + ') values(' + v +')';
        sql.sql = insert;

        return sql;
    };

    var prepareCreate = function(sql, data) {
        logDebug(JSON.stringify(data));
        sql.sql += data.table_name + ' (' + data.columns.join(',') + ')';
//        sql.sql += data.table_name + ' ' + JSON.stringify(data.columns);
        return sql;
    };

    // Execute select write result to http response
    // sql:{query_type: 'select|insert|service_def', schema:schema, sql:sqlString}
    var runQuery = function(sql, request, response) {

        var mysql      = require('mysql');
        var connection = mysql.createConnection({
          host     : 'localhost',
          database : sql.schema,
          user     : request.headers.user,
          password : request.headers.password
        });

        var odataResult;

        connection.connect();

        logInfo('Running SQL: ' + sql.sql);

        connection.query(sql.sql, function(err, rows, fields) {

            odataResult = rows;

            //logDebug('connected as id ' + connection.threadId);

            if (err) {
                writeError(response, "MySQL: "+err);
                return;
            }

            logDebug('Query result: ' + JSON.stringify(rows));

            // Close the MySQL connection
            connection.end();

            // select or table layout statement
            if(sql.query_type == 'select' || sql.query_type == 'service_def') {

                // transform into {name:table,url:table} entries
                if(sql.query_type == 'service_def') {
                    odataResult = u.map(odataResult, function(t) { return {name:t.table_name, url:t.table_name}; });
                }

                // Add etag attributes (also in service definition)
                odataResult = u.map(odataResult, mos.addEtag);

                // Add the wrapper that is required by odata
                odataResult = {value: odataResult};

                // Write the result
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify(odataResult));

                // End connection
                response.end();

                // finished
                return;
            }

            // Insert statement
            if(sql.query_type == 'insert' ) {

                logDebug('INSERT: ' + JSON.stringify(rows));

                // Write the result
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify(rows));

                // End connection
                response.end();

                // finished
                return;
            }


            // Delete statement
            if(sql.query_type == 'delete' ) {

                logDebug('DELETE: ' + JSON.stringify(rows));

                // Write the result
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify(rows));

                // End connection
                response.end();

                // finished
                return;

            }

            // Insert statement
            if(sql.query_type == 'create_table' ) {

                logDebug('create_table'+JSON.stringify(rows));

                // Write the result
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify(odataResult));

                // End connection
                response.end();

                // finished
                return;

            }

            // Something went wrong
            writeError(response, 'Internal error, unkown query_type: ' + sql.query_type);
            return;
        });
    };

    //
    // HTTP Server helpers
    // ====================

    // Respond with 406 and end the connection
    var writeError = function(response, err) {
        // Should return 406 when failing
        // http://www.odata.org/documentation/odata-version-2-0/operations/
        response.writeHead(406, {"Content-Type": "application/json"});
        response.write(err.toString()+'\n');
        response.end();

        log(err.toString());
    };


    //
    // Main
    // ====

    mos.start = function () {
        var http = require("http");

        var server = http.createServer(function(request, response) {

            log("Processing request: " +
                            JSON.stringify(request.method) + " - " +
                            JSON.stringify(request.url) + " - " +
                            JSON.stringify(request.headers));

            // Check the MySQL credentials have been supplied
            if (!checkCredentials(request, response)) return;

            // save input from POST and PUT here
            var data = '';

            request
                // read the data in the stream, if there is any
                .on('data', function (chunk) {
                    data += chunk;
                })
                // request closed, process it
                .on('end', function () {

                    try {

                        // Parse URI into sql
                        var sql = mos.parseURI(request.url, request.method);

                        // parse data and prepare insert for POST requests
                        if (request.method == 'POST') {

                            // parse odata payload into JSON object
                            data = JSON.parse(data);

                            // create insert statement using the data received
                            if(sql.query_type == 'insert')       sql = prepareInsert(sql, data);
                            if(sql.query_type == 'create_table') sql = prepareCreate(sql, data);

                        }

                        // Only GET, POST, PUT and DELTE supported
                        if( !(request.method == 'GET' ||
                              request.method == 'POST' ||
                              request.method == 'DELETE') ) {

                                writeError(response, request.method + ' not supported.');
                        }

                        // Run the query, both query_type select and service_def
                        runQuery(sql, request, response);

                    } catch(e) {
                        writeError(response, e);
                    }

                });

        });

        server.listen(defaultPort);

        log("Server is listening on port " + defaultPort);

    };


    // Exports
    // =======

    module.exports = mos;

})(this);
