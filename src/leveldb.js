// leveldb.js
//------------------------------
//
// 2015-01-15, Jonas Colmsjö
//
//------------------------------
//
// Simple bucket server on top of LevelDB.
//
// Classes:
// * BucketHttpServer - handles both read and write through HTTP GET and POST
// * BucketReadStream - internal class
// * BucketWriteStream - internal class
//
// Some notes about this bucket server:
// * Versions are supported. A new version is created each time data is written
//   to a key
// * Each chunk received in the stream is written as a separate value
// * A key looks like this: `/image1~000000111~000000017` (version 111, 17 chunks)
// * Access control is implemented using the RDBMS server. A table is created
//   for each bucket. The `grant` and `revoke` are used in the same way as for
//   RDBMS tables. Read and write is checked by by first doing a select and
//   insert respectively
//
// Using Google JavaScript Style Guide
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

(function(moduleSelf, undefined) {

  var u = require('underscore');
  var readable = require('stream').Readable;
  var writable = require('stream').Writable;
  var util = require('util');
  var url = require('url');
  var StringDecoder = require('string_decoder').StringDecoder;

  var h = require('./helpers.js');
  var CONFIG = require('./config.js');

  var Rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);

  moduleSelf.levelup = null;
  moduleSelf.leveldb = null;

  // set debugging flag
  var log = new h.log0(CONFIG.leveldbLoggerOptions);

  // check for admin operations, where the url start with /s/...
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
    // close the leveldb properly
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
    // ---------------------

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
    });

    // pipe the created stream into the provided write stream
    _valueStream.pipe(writeStream);
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
    // ---------------------
    // These are initialized in the init function

    self._noSavedChunks = 0;
    self._key = null;
    self._currentRevision = null;

  };

  // inherit stream.Writeable
  //LevelDBWriteStream.prototype = Object.create(writable.prototype);
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

      var rs = exports.BucketReadStream;
      var ws = exports.BucketWriteStream;

      var leveldb = null;

      // Just for debugging
      request.on('end', function() {
        log.debug('end of request');
      });

      // Put into leveldb
      if (request.method == 'POST') {
        leveldb = new ws();

        // catch when write is completed and wite status to response
        leveldb.on('finish', function() {
          var lastChunk = leveldb.lastSucessfullChunk();

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
            });
          });

        });

        // fetch any errors writing to database
        leveldb.on('error', function(err) {
          var lastChunk = leveldb.lastSucessfullChunk();
          log.log('Error in leveldb write. Last successful chunk: ' +
            lastChunk);

          // HTTP 400 General error: http://www.odata.org/documentation/odata-version-2-0/operations/
          // need to somehow indicate how many chunks that were written to
          // the database
          response.writeHead(400, {
            'Content-Type': 'application/json'
          });
          response.write(JSON.stringify({
            status: 'error',
            errorMessage: err,
            lastChunk: lastChunk
          }));
          response.end();

        });

        leveldb.init(request.url, function() {
          request.pipe(leveldb);
        });
      }

      // get from leveldb
      if (request.method == 'GET') {
        leveldb = new rs();
        leveldb.init(request.url, function() {
          leveldb.pipeReadStream(response);
        });
      }
    };

  // HTTP REST Server that
  exports.BucketHttpServer.prototype.main = function(request, response) {
    log.debug('In main ...');

    var parsedURL = url.parse(request.url, true, false);
    var a = parsedURL.pathname.split("/");

    // drop the first element which is an empty string
    var tokens = a.splice(1, a.length);

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

        try {

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

          rdbms.pipe(bucket,
            function() {
              odataResult.rdbmsResponse = decoder.write(bucket.get());
              h.writeResponse(response, odataResult);
            },
            function(err) {
              h.writeError(response, err);
            }
          );

        } catch (e) {
          h.writeError(response, e);
        }

      });

    } else {
      // Perform read/write operation

      var bucketName = a[2];
      var schema = a[1];
      var options = {
        credentials: {
          database: schema,
          user: accountId,
          password: request.headers.password
        },
        closeStream: false
      };

      var credentialsOk = false;

      // Check that the user can perform read operations
      if (request.method == 'GET') {
        options.sql = 'select id, log from ' + schema + '.' + bucketName;
        options.processRowFunc = null;

        log.debug('Check privileges for user ' + accountId + ' on bucket ' +
                  schema + '/' + bucketName);

        var mysqlRead = new Rdbms.sqlRead(options);
        mysqlRead.fetchAll(
          function(res) {
            credentialsOk = true;
          }, function(err) {
            h.writeError(response, 'Cannot read from bucket: ' + err);
          }
        );
      }

      // Check that the user can perform write operations
      if (request.method == 'POST') {
        options.tableName = bucketName;
        options.resultStream = bucket;
        var writeStream = new Rdbms.sqlWriteStream(options,
          function() {
            credentialsOk = true;
          },
          function(err) {
            h.writeError(response, 'Cannot write to bucket. ' + err);
          }
        );

        // create stream that writes json into rdbms
        var jsonStream = new require('stream');
        jsonStream.pipe = function(dest) {
          dest.write(JSON.stringify({id: 2, log: 'writing to bucket ' +
                                                  schema + '/' + bucketName +
                                                  ' with credentials ' +
                                                  accountId}));
        };

        jsonStream.pipe(writeStream);
      }

      // Perform the requested operation if the credentials are ok
      if (credentialsOk) {
        // Perform read/write operation
        exports.BucketHttpServer.prototype.handleReadWriteRequest(request,
          response);
      }
    }
  };

  //
  // Manage LevelDB users - admin functions
  // ====================================

  // Admin constructor, credentials should be supplied
  exports.bucketAdmin = function(options) {
    var self_ = this;
    self_.options = options;
  };

  // create a new bucket
  exports.bucketAdmin.prototype.checkGet = function(bucketPath) {};

  // create a new bucket
  exports.bucketAdmin.prototype.checkPost = function(bucketPath) {};

})(this);
