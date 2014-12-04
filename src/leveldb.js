
(function(moduleSelf, undefined) {

  var u        = require('underscore');
  var readable = require('stream').Readable;
  var writable = require('stream').Writable;
  var util     = require('util');

  var h        = require('./helpers.js');
  var CONFIG   = require('./config.js');

  moduleSelf.levelup = null;
  moduleSelf.leveldb = null;

  // set debugging flag
  var log = new h.log0(CONFIG.leveldbLoggerOptions);

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

  exports.LevelDBReadStream = function() {

    var self = this;

    // call Readable stream constructor
    readable.call(this);

    //
    // Privileged properties
    // ---------------------

    // These are initialized in the init function

    self._noReadChunks     = 0;
    self._key             = null;
    self._currentRevision = null;
  };

  // inherit stream.Readable
  exports.LevelDBReadStream.prototype = Object.create(readable.prototype);

  // Initialize leveldb object
  exports.LevelDBReadStream.prototype.init = function(key, cb) {

    var self = this;
    log.debug('LevelDB.init: key=' + key);

    // Open the LevelDB database
    if (moduleSelf.levelup === null)
      moduleSelf.levelup = require('level');

    if (moduleSelf.leveldb === null)
      moduleSelf.leveldb = moduleSelf.levelup('./mydb');

    // save for later use
    self._key               = key;

    // get the current revision and then run the callback
    h.getCurrentRev(moduleSelf.leveldb, key, self, cb);
  };

  // create a leveldb stream and pipe it into a provided write stream
  exports.LevelDBReadStream.prototype.pipeReadStream = function(writeStream) {

    var self = this;
    log.debug('LevelDB.pipeReadStream: key=' + self._key + ', rev=' + self._currentRevision);

    var _revision = h.pad(self._currentRevision, 9);

    // create stream that reads all chunks
    var _valueStream = moduleSelf.leveldb.createReadStream({
      start:   self._key + '~' + _revision + '~000000000',
      end:     self._key + '~' + _revision + '~999999999',
      limit:   999999999,
      reverse: false,
      keys:    false,
      values:  true
    });

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

  exports.LevelDBWriteStream = function() {

    var self = this;

    // call Writable stream constructor
    writable.call(this);

    //
    // Privileged properties
    // ---------------------
    // These are initialized in the init function

    self._noSavedChunks   = 0;
    self._key             = null;
    self._currentRevision = null;

  };


  // inherit stream.Writeable
  //LevelDBWriteStream.prototype = Object.create(writable.prototype);
  util.inherits(exports.LevelDBWriteStream, writable);

  // Initialize leveldb object
  exports.LevelDBWriteStream.prototype.init = function(key, cb) {

    var self = this;
    log.debug('LevelDB.init: key=' + key);

    // Open the LevelDB database
    if (moduleSelf.levelup === null)
      moduleSelf.levelup = require('level');

    if (moduleSelf.leveldb === null)
      moduleSelf.leveldb = moduleSelf.levelup('./mydb');

    // save for later use
    self._key               = key;

    // get the current revision and then run the callback
    h.getCurrentRev(moduleSelf.leveldb, key, self,
      function(){ self._currentRevision++; cb();}
    );

  };

  // override the write function
  exports.LevelDBWriteStream.prototype._write = function (chunk, encoding, done) {

    var self = this;
    var _k = h.formatKey(self._key,
                             self._currentRevision,
                             ++self._noSavedChunks);

    moduleSelf.leveldb.put(_k, chunk, function(err) {
      log.debug('WROTE: chunk ('+self._key+','+
                                      self._currentRevision+','+
                                      self._noSavedChunks+')');

      if (err) {
        // save the number of the last successful chunk
        --self._noSavedChunks;
        var _msg = 'LevelDB stream write: error saving chunk! '+err;
        log.debug(_msg);
        self.emit('error', _msg);
      }

      // finished processing chunk
      done();

    });

  };

  exports.LevelDBWriteStream.prototype.lastSucessfullChunk = function () {
    return this._noSavedChunks;
  };

  // Finish up and close the stream
  exports.LevelDBWriteStream.prototype.close = function () {
    var self = this;

    log.debug('LevelDBWriteStream close');

    // save the last chunk if provided
    // risk that close below is exec first? if(arguments.length > 0) this._write(arguments[0]);

    self.emit('finish');

    // call the super end fucntion
    //self.super_.end.apply(arguments);
  };


  exports.LevelDBWriteStream.prototype.end = exports.LevelDBWriteStream.prototype.close;


  //
  // HTTP Server
  // ============
  //

  exports.LevelDBHttpServer = function() {
    var self = this;
  };

  exports.LevelDBHttpServer.prototype.main = function(request, response) {

    var rs = exports.LevelDBReadStream;
    var ws = exports.LevelDBWriteStream;

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
            log.debug('Finish event in leveldb write. Last chunk: ' + lastChunk);

            response.writeHead(200, {
              'Content-Type': 'application/json'
            });
            response.write(JSON.stringify({
              status: 'ok',
              last_chunk: lastChunk,
              etag: hash
            }));
            response.end();
          });
        });

      });


      // fetch any errors writing to database
      leveldb.on('error', function(err) {
        var lastChunk = leveldb.lastSucessfullChunk();
        log.log('Error in leveldb write. Last successful chunk: ' + lastChunk);

        // HTTP 400 General error: http://www.odata.org/documentation/odata-version-2-0/operations/
        // need to somehow indicate how many chunks that were written to
        // the database
        response.writeHead(400, {
          'Content-Type': 'application/json'
        });
        response.write(JSON.stringify({
          status: 'error',
          error_message: err,
          last_chunk: lastChunk
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


})(this);
