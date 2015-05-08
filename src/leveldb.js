// leveldb.js
//------------
//
// 2015-01-15, Jonas Colmsjö
//---------------------------
//
// Simple bucket server on top of LevelDB. This implementation can be used as
// a reference if other backends are developed. Just implement the classes
// listed below.
//
// Classes:
// * `BucketHttpServer` - handles both read and write through HTTP GET and POST.
//   Is ised by `main.js`
// * `BucketReadStream` - internal class
// * `BucketWriteStream` - internal class
//
// Some notes about this bucket server:
// * Versions are supported. A new version is created each time data is written
//   to a key
// * Each chunk received in the stream is written as a separate value
// * A key looks like this: `/image1~000000111~000000017` (version 111, 17 chunks)
// * Access control is implemented using the RDBMS server. A table is created
//   for each bucket. The `grant` and `revoke` methods are used in the same way
//   as for RDBMS tables. Read and write is checked by by first doing a select and
//   insert respectively
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

(function(moduleSelf, undefined) {

  var u = require('underscore');
  var readable = require('stream').Readable;
  var writable = require('stream').Writable;
  var util = require('util');
  var url = require('url');
  var StringDecoder = require('string_decoder').StringDecoder;

  var h = require('./helpers.js');
  var CONFIG = require('../config.js');
  var CONSTANTS = require('./constants.js');

  var Rdbms = require(CONSTANTS.ODATA.RDBMS_BACKEND);

  moduleSelf.levelup = null;
  moduleSelf.leveldb = null;

  // set debugging flag
  var log = new h.log0(CONSTANTS.leveldbLoggerOptions);

  // list of admin operations
  var adminOps = ['create_bucket', 'drop_bucket'];

  // Check if operation is a valid admin operation
  exports.isAdminOp = function(op) {
    return adminOps.indexOf(op) !== -1;
  };

  //
  // Common for readable and writable stream
  // =======================================
  //

  exports.close = function() {
    // close the leveldb database properly
    moduleSelf.leveldb.close();
  };

  //
  // Leveldb readable stream
  // =======================
  //

  exports.BucketReadStream = function() {

    var self = this;

    // call Readable stream constructor
    readable.call(this);

    //
    // Privileged properties
    // These are initialized in the init function

    self._noReadChunks = 0;
    self._key = null;
    self._currentRevision = null;
  };

  // inherit stream.Readable
  exports.BucketReadStream.prototype = Object.create(readable.prototype);

  // Initialize leveldb object
  exports.BucketReadStream.prototype.init = function(key, cb) {

    var self = this;
    log.debug('LevelDB.init: key=' + key);

    // Open the LevelDB database
    if (moduleSelf.levelup === null) {
      moduleSelf.levelup = require('level');
    }

    if (moduleSelf.leveldb === null) {
      moduleSelf.leveldb = moduleSelf.levelup('./mydb');
    }

    // save for later use
    self._key = key;

    // get the current revision and then run the callback
    h.getCurrentRev(moduleSelf.leveldb, key, self, cb);
  };

  // create a leveldb stream and pipe it into a provided write stream
  exports.BucketReadStream.prototype.pipeReadStream = function(writeStream) {
    var self = this;

    return new Promise(function(fulfill, reject) {

      var _revision = h.pad(self._currentRevision, 9);

      var _options = {
        start: self._key + '~' + _revision + '~000000000',
        end: self._key + '~' + _revision + '~999999999',
        limit: 999999999,
        reverse: false,
        keys: false,
        values: true
      };

      log.debug('LevelDB.pipeReadStream: ' + JSON.stringify(_options));

      // create stream that reads all chunks
      var _valueStream = moduleSelf.leveldb.createReadStream(_options);

      _valueStream.on('end', function() {
        log.debug('End event in LevelDBReadStream.');
        self.emit('end');
        fulfill();
      });

      // pipe the created stream into the provided write stream
      _valueStream.pipe(writeStream);
    });
  };

  //
  // Leveldb writable stream
  // =======================
  //

  exports.BucketWriteStream = function() {

    var self = this;

    // call Writable stream constructor
    writable.call(this);

    //
    // Privileged properties
    // These are initialized in the init function

    self._noSavedChunks = 0;
    self._key = null;
    self._currentRevision = null;

  };

  // inherit stream.Writeable
  // LevelDBWriteStream.prototype = Object.create(writable.prototype);
  util.inherits(exports.BucketWriteStream, writable);

  // Initialize leveldb object
  exports.BucketWriteStream.prototype.init = function(key, cb) {

    var self = this;
    log.debug('LevelDB.init: key=' + key);

    // Open the LevelDB database
    if (moduleSelf.levelup === null) {
      moduleSelf.levelup = require('level');
    }

    if (moduleSelf.leveldb === null) {
      moduleSelf.leveldb = moduleSelf.levelup('./mydb');
    }

    // save for later use
    self._key = key;

    // get the current revision and then run the callback
    h.getCurrentRev(moduleSelf.leveldb, key, self,
      function() {
        self._currentRevision++;
        cb();
      }
    );

  };

  // override the write function
  exports.BucketWriteStream.prototype._write = function(chunk, encoding, done) {

    var self = this;
    var _k = h.formatKey(self._key,
      self._currentRevision,
      ++self._noSavedChunks);

    moduleSelf.leveldb.put(_k, chunk, function(err) {

      log.debug('LevelDBWriteStream.pipe wrote: ' + _k +
        ', no saved chunks: ' + self._noSavedChunks);

      if (err) {
        // save the number of the last successful chunk
        --self._noSavedChunks;
        var _msg = 'LevelDB stream write: error saving chunk! ' + err;
        log.debug(_msg);
        self.emit('error', _msg);
      }

      // finished processing chunk
      done();

    });

  };

  exports.BucketWriteStream.prototype.lastSucessfullChunk = function() {
    return this._noSavedChunks;
  };

  // Finish up and close the stream
  exports.BucketWriteStream.prototype.close = function() {
    var self = this;

    log.debug('LevelDBWriteStream close');

    // save the last chunk if provided
    // risk that close below is exec first?
    // if(arguments.length > 0) this._write(arguments[0]);

    self.emit('finish');

    // call the super end fucntion
    //self.super_.end.apply(arguments);
  };

  exports.BucketWriteStream.prototype.end =
    exports.BucketWriteStream.prototype.close;

  //
  // HTTP Server
  // ============
  //

  exports.BucketHttpServer = function() {
    var self = this;
  };

  // handle both read and write requests
  exports.BucketHttpServer.prototype.handleReadWriteRequest =
    function(request, response) {

      return new Promise(function(fulfill, reject) {

        var rs = exports.BucketReadStream;
        var ws = exports.BucketWriteStream;

        var leveldb = null;

        // Just for debugging
        request.on('end', function() {
          log.debug('handleReadWriteRequest: end of http request');
        });

        // Put into leveldb
        if (request.method == 'POST') {
          leveldb = new ws();

          // catch when write is completed and wite status to response
          leveldb.on('finish', function() {
            var lastChunk = leveldb.lastSucessfullChunk();

            // calculate hash by reading the content from leveldb
            leveldb = new rs();
            leveldb.init(request.url, function() {
              h.calcHash(leveldb, 'sha1', 'hex', function(hash) {
                log.debug('Finish event in leveldb write. Last chunk: ' +
                  lastChunk);

                response.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                response.write(JSON.stringify({
                  status: 'ok',
                  lastChunk: lastChunk,
                  etag: hash
                }));
                response.end();
                fulfill();
              });
            });

          });

          // fetch any errors writing to database
          leveldb.on('error', function(err) {
            var lastChunk = leveldb.lastSucessfullChunk();
            log.log('Error in leveldb write. Last successful chunk: ' +
              lastChunk);

            // need to somehow indicate how many chunks that were written to
            // the database
            h.writeError(response, JSON.stringify({
              status: 'error',
              errorMessage: err,
              lastChunk: lastChunk
            }));

            reject(err);
          });

          leveldb.init(request.url, function() {
            request.pipe(leveldb);
          });

        }

        // get from leveldb
        if (request.method == 'GET') {
          leveldb = new rs();

          leveldb.on('finish', function() {
            fulfill();
          });

          leveldb.on('error', function(err) {
            reject(err);
          });

          leveldb.init(request.url, function() {
            leveldb.pipeReadStream(response);
          });
        }

      });

    };

  // Check if this is an operation on a bucket by looking for the `b_`
  // prefix, `tokens_ = [ account, 'b_'bucket]` or
  //                   `[ account, 's', 'create_bucket' | 'delete_bucket' ]`
  exports.BucketHttpServer.prototype.isBucketOp = function(url) {
    var tokens = h.tokenize(url);

    return ((tokens.length === 3 && exports.isAdminOp(tokens[2])) ||
      (tokens.length === 2 &&
        tokens[1].substr(0, CONFIG.ODATA.BUCKET_PREFIX.length) ===
        CONFIG.ODATA.BUCKET_PREFIX));
  };

  // HTTP REST Server
  exports.BucketHttpServer.prototype.main = function(request, response, next) {
    var self = this;

    log.debug('In main ...');

    // do nothing if the response is closed
    if (response.finished) {
      next();
    }

    if (!self.isBucketOp(request.url)) {
      next();
      return;
    }

    var tokens = h.tokenize(request.url);

    log.debug('Bucket operation ' + request.method + " on " + tokens[0] +
      '.' + tokens[1] + ' ' +
      ((tokens.length === 3) ? tokens[2] : ''));

    var accountId = request.headers.user;

    var decoder = new StringDecoder('utf8');
    var bucket = new h.arrayBucketStream();

    // tokens = [ account, 'b_'bucket ] or
    //          [ account, 's', create_bucket | delete_bucket ]
    if (tokens[1] === CONFIG.ODATA.SYS_PATH) {

      var bucketOp = tokens[2];

      // Check that the system operation is valid
      if (!exports.isAdminOp(bucketOp)) {
        var str = "Incorrent admin operation: " + bucketOp;
        log.log(str);
        h.writeError(response, str);
        next();
        return;
      }

      log.debug('Performing system operation: ' + bucketOp);

      // save input from POST and PUT here
      var data = '';

      request
      // read the data in the stream, if there is any
        .on('error', function(err) {

        var str = "Error in http input data: " + err +
          ", URL: " + request.url +
          ", headers: " + JSON.stringify(request.headers) + " TYPE:" +
          bucketOp;

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

        // parse odata payload into JSON object
        var jsonData = null;
        if (data !== '') {
          jsonData = h.jsonParse(data);
          log.debug('Data received: ' + JSON.stringify(jsonData));
        }

        var odataResult = {};
        var rdbms;
        var options = {
          credentials: {
            database: accountId,
            user: accountId,
            password: request.headers.password
          },
          closeStream: true
        };

        if (bucketOp === 'create_bucket') {
          options.tableDef = {};
          options.tableDef.tableName = jsonData.bucketName;
          options.tableDef.columns = ['id int', 'log varchar(255)'];
          rdbms = new Rdbms.sqlCreate(options);
        }

        if (bucketOp === 'drop_bucket') {
          options.tableDef = {};
          options.tableDef.tableName = jsonData.bucketName;
          rdbms = new Rdbms.sqlDrop(options);
        }

        var str = 'Performing bucket operation: ' + bucketOp +
          '. options: ' + JSON.stringify(options);
        log.log(str);

        rdbms.pipe2(bucket).then(
            function() {
              log.debug('IN THEN')
              odataResult.rdbmsResponse = bucket.get().toString();
              h.writeResponse(response, odataResult);
              next();
            })
          .catch(function(err) {
            log.log('Error in main: ', err);
            h.writeError(response, err);
            next();
          });

      });

    } else {
      // Perform read/write operation

      var bucketName = tokens[1];
      var schema = tokens[0];
      var options = {
        credentials: {
          database: schema,
          user: accountId,
          password: request.headers.password
        },
        closeStream: false
      };

      // Check that the user can perform read operations
      if (request.method == 'GET') {
        options.sql = 'select id, log from ' + schema + '.' + bucketName;

        log.debug('Check privileges for user ' + accountId + ' on bucket ' +
          schema + '/' + bucketName);

        // check privileges using rdbms, read from leveldb if successful
        var mysqlRead = new Rdbms.sqlRead(options);
        /*        mysqlRead.fetchAll(
                  // end
                  function(res) {
                    exports.BucketHttpServer.prototype.handleReadWriteRequest(request,
                      response);
                  },
                  // handle errors
                  function(err) {
                    h.writeError(response, 'Cannot read from bucket: ' + err);
                  }
                );
        */

        mysqlRead.fetchAll2()
          .then(function(res) {
            return self.handleReadWriteRequest(request, response);
          })
          .then(function() {
            next();
          })
          .catch(function(err) {
            h.writeError(response, 'Cannot read from bucket: ' + err);
            next();
          });

      }

      // Check that the user can perform write operations
      if (request.method == 'POST') {
        options.tableName = bucketName;
        options.resultStream = bucket;

        // check the privileges using the rdbms, write to leveldb if successful
        var writeStream = new Rdbms.sqlWriteStream(options,
          // end
          function() {
            exports.BucketHttpServer.prototype.handleReadWriteRequest(request,
                response)
              .then(function() {
                next();
              });
          },
          // error
          function(err) {
            h.writeError(response, 'Cannot write to bucket. ' + err);
            next();
          }
        );

        // create stream that writes json into rdbms
        var jsonStream = new require('stream');
        jsonStream.pipe = function(dest) {
          dest.write(JSON.stringify({
            id: 2,
            log: 'writing to bucket ' +
              schema + '/' + bucketName +
              ' with credentials ' +
              accountId
          }));
        };

        jsonStream.pipe(writeStream);
      }

    }
  };

})(this);
