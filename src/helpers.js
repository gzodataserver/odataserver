// helpers.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Misc helpers fucntions
//
//
// Using Google JavaScript Style Guide
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

(function(moduleSelf, undefined) {

  var h = {};
  var u = require('underscore');
  var crypto = require('crypto');
  var Writable = require('stream').Writable;

  var CONFIG = require('../config.js');

  var StringDecoder = require('string_decoder').StringDecoder;
  var decoder = new StringDecoder('utf8');

  // New enhanced logging class
  // Each instance has its own options for logging level
  //
  // options: {
  //   debug: boolean,
  //   info: boolean,
  //   noLogging: boolean,
  //   filename: string to prefix logging with
  // };

  h.log0 = function(options) {
    var self = this;
    self._debug = false;
    self._info = true;
    self._noLogging = false;
    self._filename = null;
    if (options !== undefined) {
      self.logLevel(options);
    }
  };

  h.log0.prototype.debug = function(text) {
    var self = this;
    if (self._debug && !self._noLogging) {
      self.log('DEBUG:' + text);
    }
  };

  h.log0.prototype.info = function(text) {
    var self = this;
    if (self._info && !self._noLogging) {
      self.log('INFO:' + text);
    }
  };

  h.log0.prototype.log = function(text) {
    var self = this;
    if (self._filename !== undefined && self._filename !== null) {
      text = self._filename + ':' + text;
    }

    if (!self._noLogging) {
      console.log(text);
    }
  };

  h.log0.prototype.logLevel = function(options) {
    var self = this;
    if (options.debug !== undefined) {
      self._debug = options.debug;
    }

    if (options.info !== undefined) {
      self._info = options.info;
    }

    if (options.noLogging !== undefined) {
      self._noLogging = options.noLogging;
    }

    if (options.filename !== undefined) {
      self._filename = options.filename;
    }
  };

  var log = new h.log0({
    debug: false
  });

  // change to false to stop logging
  h.debug = false;
  h.info = true;
  h.noLogging = false;

  h.log = {

    debug: function(text) {
      if (h.debug && !h.noLogging) {
        console.log('DEBUG: ' + text);
      }
    },

    info: function(text) {
      if (h.info && !h.noLogging) {
        console.log('INFO: ' + text);
      }
    },

    log: function(text) {
      if (!h.noLogging) {
        console.log(text);
      }
    }
  };

  // converts a number to a string and pads it with zeros: pad(5,1) -> 00001
  // a - the number to convert
  // b - number of resulting characters
  h.pad = function(a, b) {
    return (1e15 + a + "").slice(-b);
  };

  // Calculate hash from a leveldb stream
  h.calcHash = function(leveldb, alg, enc, cb) {
    var hash = crypto.createHash(alg);

    hash.setEncoding(enc);

    leveldb.on('end', function() {
      hash.end();
      cb(hash.read());
    });

    // read all file and pipe it (write it) to the hash object
    leveldb.pipeReadStream(hash);
  };

  h.hashString = function(alg, enc, data) {
    var hashSum = crypto.createHash(alg);
    hashSum.update(data);
    return hashSum.digest(enc);
  };

  h.calcHash2 = function(obj, alg, enc) {
    var func = crypto.createHash(alg);

    for (var key in obj) {
      func.update('' + obj[key]);
    }

    return func.digest(enc);
  };

  // calculate the MD5 etag for a JSON object
  h.addEtag = function(obj) {
    // return a clone
    //var o = u.clone(obj),
    e = h.calcHash2(obj, 'md5', 'hex');

    obj['@odata.etag'] = e;

    return obj;
  };

  //
  // Leveldb Helpers
  // ----------------

  // Store data/blobs in chunks in the database. Keys have the following form:
  // key~rev#~chunk#
  // rev# and chunk# are 9 digits key~000000001~000000001
  //

  // Read keys into an array and process with callback
  // maximum 999.999.999 revisions and 999.999.999 chunks
  h.readKeys = function(leveldb, keyPrefix, cb) {

    var _keyStream = leveldb.createReadStream({
      start: keyPrefix + '~000000000',
      end: keyPrefix + '~999999999',
      limit: 999999999,
      reverse: false,
      keys: true,
      values: false
    });

    var _keys = [];

    _keyStream.on('data', function(data) {
      _keys.push(data);
    });

    _keyStream.on('error', function(err) {
      log.log('Error reading leveldb stream: ' + err);
    });

    _keyStream.on('close', function() {
      log.debug('_readKeys: ' + JSON.stringify(_keys));
      cb(_keys);
    });
  };

  // Read all chunks for file and process chunk by chunk
  // maximum 999.999.999 revisions and 999.999.999 chunks
  h.readValue = function(leveldb, keyPrefix, revision, cbData, cbEnd) {

    var _revision = pad(revision, 9);

    var _keyStream = leveldb.createReadStream({
      start: keyPrefix + '~' + _revision + '~000000000',
      end: keyPrefix + '~' + _revision + '~999999999',
      limit: 999999999,
      reverse: false,
      keys: false,
      values: true
    });

    _keyStream.on('data', function(data) {
      cbData(data);
    });

    _keyStream.on('error', function(err) {
      log.log('Error reading leveldb stream: ' + err);
    });

    _keyStream.on('close', function() {
      cbEnd();
    });
  };

  // Get the last revison of a key and run callback
  // -1 is used if the file does not exist
  h.getCurrentRev = function(leveldb, keyPrefix, revObj, cb) {

    var currentRevision = -1;

    h.readKeys(leveldb, keyPrefix, function(keys) {

      if (keys.length > 0) {
        var _revs = u.map(
          keys,
          function(k) {
            return k.slice(keyPrefix.length + 1, keyPrefix.length + 1 + 9);
          }
        );

        currentRevision = parseInt(u.max(_revs, function(r) {
          return parseInt(r);
        }));
      }

      log.debug('LevelDB.getCurrentRev: keyPrefix=' + keyPrefix + ', rev= ' +
        currentRevision);

      // Save revision and run callback
      revObj._currentRevision = currentRevision;
      cb(currentRevision);
    });
  };

  // format a key, revision and chunk: key~000000001~000000000
  h.formatKey = function(k, revNum, chunkNum) {
    return k + '~' + h.pad(revNum, 9) + '~' + h.pad(chunkNum, 9);
  };

  //
  // Stream that aggregates objects that are written into array
  // ---------------------------------------------------------

  h.arrayBucketStream = function(options) {
    // if new wasn't used, do it for them
    if (!(this instanceof arrayBucketStream)) {
      return new arrayBucketStream(options);
    }

    // call stream.Writeable constructor
    Writable.call(this, options);

    this.data = [];
  };

  // inherit stream.Writeable
  h.arrayBucketStream.prototype = Object.create(Writable.prototype);

  // override the write function
  h.arrayBucketStream.prototype._write = function(chunk, encoding, done) {
    this.data.push(chunk);
    done();
  };

  h.arrayBucketStream.prototype.get = function() {
    return this.data;
  };

  h.arrayBucketStream.prototype.empty = function() {
    this.data = [];
  };

  // calculate account id from email
  h.email2accountId = function(email) {
    return h.hashString(CONFIG.ACCOUNT_ID.HASH_ALG,
      CONFIG.ACCOUNT_ID.HASH_ENCODING,
      CONFIG.ACCOUNT_ID.SECRET_SALT + email).slice(0, 12);

  };

  // generate random string
  h.randomString = function(len) {
    try {
      var buf = crypto.randomBytes(256);
      var str = new Buffer(buf).toString('base64');
      return str.slice(0, len);
    } catch (ex) {
      // handle error, most likely are entropy sources drained
      console.log('Error! ' + ex);
      return null;
    }
  };

  //
  // Stream that aggregates objects that are written into array
  // ---------------------------------------------------------

  h.arrayBucketStream = function(options) {
    // if new wasn't used, do it for them
    if (!(this instanceof h.arrayBucketStream)) {
      return new h.arrayBucketStream(options);
    }

    // call stream.Writeable constructor
    Writable.call(this, options);

    this.data = [];
  };

  // inherit stream.Writeable
  h.arrayBucketStream.prototype = Object.create(Writable.prototype);

  // override the write function
  h.arrayBucketStream.prototype._write = function(chunk, encoding, done) {
    this.data.push(chunk);
    done();
  };

  h.arrayBucketStream.prototype.get = function() {
    return this.data;
  };

  h.arrayBucketStream.prototype.getDecoded = function() {
    return decoder.write(this.data);
  };

  h.arrayBucketStream.prototype.empty = function() {
    this.data = [];
  };

  //
  // JSON input:
  // [{col1: val1, ..., colX: valX}, ... ,{}]
  //
  // SQL output:
  // insert into table_name('col1', ...'colX')
  // values ('val1', ..., 'valX'), ..., ()
  //
  // All JSON objects must contain the same columns
  //
  // Check if the chunk is valid JSON. If not, append with next chunk and check
  // again
  //
  // NOTE: Only one JSON object is currently supported, NOT arrays

  h.json2insert = function(database, tableName, data) {

    // separate keys (columns names) and values into separate strings
    // values have quotes but column names don't
    var k = u.keys(data).join(',');
    var v = JSON.stringify(u.values(data));

    // Skip [ and ] characters in string
    v = v.substring(1, v.length - 1);

    // The insert query
    var insert = 'insert into ' + database + '.' + tableName +
      '(' + k + ') values(' + v + ')';
    return insert;
  };

  // build update sql from json object
  h.json2update = function(database, tableName, data) {

    // {k1: v1, k2: v2} -> k1=v1,k2=v2
    var str = u.map(data, function(k, v) {
      return v + '=' + k;
    }).join(',');

    // The update query
    var update = 'update ' + database + '.' + tableName + ' set ' + str;
    return update;
  };

  h.jsonParse = function(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      log.log('Error parsing JSON:' + e);
    }
  };

  //
  // Setup dtrace
  // -------------
  // View probe: `sudo dtrace -Z -n 'nodeapp*:::probe{ trace(copyinstr(arg0)); }'`

  if (CONFIG.enableDtrace) {
    var dtrace = require('dtrace-provider');
    var dtp = dtrace.createDTraceProvider("nodeapp");
    var p1 = dtp.addProbe("probe", "char *");
    dtp.enable();
  }

  h.fireProbe = function(data) {
    if (CONFIG.enableDtrace) {
      dtp.fire("probe", function(p) {
        return [data, "odataserver"];
      });
    }
  };

  //
  // HTTP response
  // -------------

  // Respond with 200 and the result
  h.writeResponse = function(response, jsonData) {

    response.writeHead(200, {
      "Content-Type": "application/json"
    });

/*    odataResult = {
      d: {
        results: jsonData
      }
    };
*/

    var odataResult = {};
    odataResult.d = {};

    // The actual data
    if (jsonData.value !== undefined) {
      odataResult.d.results = jsonData.value;
    }

    // Some additional attributes (for convenience)
    if (jsonData.rdbmsResponse !== undefined) {
      odataResult.d.rdbmsResponse = jsonData.rdbmsResponse;
    }
    if (jsonData.email !== undefined) {
      odataResult.d.email = jsonData.email;
    }
    if (jsonData.accountId !== undefined) {
      odataResult.d.accountId = jsonData.accountId;
    }
    if (jsonData.password !== undefined) {
      odataResult.d.password = jsonData.password;
    }

    response.write(JSON.stringify(odataResult));
    response.end();
  };

  // Respond with 406 and end the connection
  h.writeError = function(response, err) {
    // Should return 406 when failing
    // http://www.odata.org/documentation/odata-version-2-0/operations/

    odataResult = {
      d: {
        error: err.toString() + '. See /' + CONFIG.ODATA.HELP_PATH +
                                ' for help.'
      }
    };

    response.writeHead(406, {
      "Content-Type": "application/json"
    });
    response.write(JSON.stringify(odataResult));
    response.end();

    log.log(err.toString());
  };

  // check that the request contains user and password headers
  h.checkCredentials = function(request, response) {

    log.debug('Checking credentials: ' + JSON.stringify(request.headers));

    // Check that the request is ok
    //return !(!request.headers.hasOwnProperty('user') ||
    //  !request.headers.hasOwnProperty('password'));

    return true;

  };

  // Exports
  // =======

  module.exports = h;

})(this);
