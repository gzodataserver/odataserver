Feature branches
================

The [git-workflow](http://colmsjo.com/Git-Workflow/) method is used.
This file is used to track the content of each feature branch.

There are two main branches:

 * master - contains releases
 * develop - features are merged here and then released once ready

There is one branch for each feature that is developed. These
branches are deleted once the feature has been merged.


feature1 (not implemented)
-------------------------

A response currently looks like this:

{
  "d": {
    "results": {
      "accountId": "0b213a639078",
      "value": [
        {
          "col1": 11,
          "col2": "11",
          "@odata.etag": "6369f0832533e140100edb005805e72e"
        },
        {
          "col1": 11,
          "col2": "11",
          "@odata.etag": "6369f0832533e140100edb005805e72e"
        }
      ]
    }
  }
}

But is should look like this according to the spec:

{
  "d": {
    "accountId": "0b213a639078",
    "results": [
      {
        "col1": 11,
        "col2": "11",
        "@odata.etag": "6369f0832533e140100edb005805e72e"
      },
      {
        "col1": 11,
        "col2": "11",
        "@odata.etag": "6369f0832533e140100edb005805e72e"
      }
    ]
  }
}


feature2 (implemented)
---------------------

The server currently don't support the method `OPTIONS`. This is used by the
browser when setting request headers `username` and `password`

A request can look like this:

```
main.js:Processing request: "OPTIONS" - "/0b213a639078/b_rootapp" - {"host":"localhost:9000","origin":"http://127.0.0.1:8125","access-control-request-method":"GET","content-length":"0","access-control-request-headers":"password, origin, user","connection":"keep-alive","accept":"*/*","user-agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/600.5.17 (KHTML, like Gecko) Version/8.0.5 Safari/600.5.17","referer":"http://127.0.0.1:8125/login.html","accept-language":"sv-se","accept-encoding":"gzip, deflate"}
```

A empty response with the appropriate headers should be enough, see
[W3 Spec](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html). We're using
CORS header when enables in `config.js`.


feature3 (implemented)
---------------------

Implemented promises in `mysql.js` and improved the unit tests. It should now
be easier to run a sequence of mysql commands withotu ending up in
callback-hell.


feature4 (implemented)
---------------------

The service definition API does not validate the credentials. The reason is
that the sqlAdmin object is used (which uses the root credentials) and no
validation is performed first.

Must validate credentials before using the sqlAdmin functions.


feature5 (not implemented)
--------------------------

Make it possible to execute any valid SQL. This can be used to call
stored procedures and also to do complex things like joins etc.


feature 6 (implemented)
--------------------------

Make it possible to use connectjs (expressjs) type of middleware.

Setup a customized OData Sever like this:

```
var odata = require('odataserver');

var buckets = new odata.BucketHttpServer();
var rdbms = new odata.ODataServer();


odata.user(function(req, res, next) {

  // put custom middleware logic here

  next();
}));

odata.use(buckets.main);
odata.use(rdbms.main)

odata.start();

```

In addition, it should also be possible to do this:

```
var odata = require('odataserver');

var express = require('express');
var app = express();

var buckets = new odata.BucketHttpServer();
var rdbms = new odata.ODataServer();

app.use(buckets.main);
app.use(rdbms.main);

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
```

feature 7 (not implemented)
--------------------------

Implement the `$expand` keyword with joins.

`/table1?$expand=table2$filter=col1 eq table2/col1` becomes
`select * from table1,table2 where table1.col1=table2.col1`

Implement like this:

 * Add a rule to `translateOp` in `filter2where`: '/' becomes '.'
  * Does mysql allow `col1` instead of `table1.col1`?? If not, check `sqlObjects`
    for join when built, add `result.schema` before identifiers that are missing
    entity/table
 * add rule to `odata2sql`: `$expand` returns `{id: 2.5, q: ','+param}`


feature 8 (not implemented)
---------------------------

Implement the `$batch` keyword. Multipart messages are used to send several
queries in one request.


feature 8 (not implemented)
--------------------------

The server cannot be configured easily when used as a module. All configuration
is in the file `config.js`. The server is used like this:

```
var main = require('../src/main.js');
main.start();
```

It should rather be used like this:

```
var odataserver = require('odataserver');

var config = {
  ODATA: {
    HOST: 'localhost',
    PORT: '9000'
  },

  RDBMS: {
    DB_HOST: 'localhost',
  }
};

var app = odataserver(config);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var server = app.listen(3000, function () {
  console.log('Example app listening at http://localhost:3000');  
});

```

The start method looks like this:

```
exports.start = function() {
  var self = this;

  if (CONFIG.enableTooBusy) {
    setupTooBusy();
  }

  // setup the middleware
  // --------------------

  moduleSelf.server = new middleware();
  self.init(moduleSelf.server);

  // start http server
  // -----------------

  if (CONFIG.HTTPS_OPTIONS.USE_HTTPS) {

    log.log('Use HTTPS.');

    var httpsOptions = {
      key: fs.readFileSync(CONFIG.HTTPS_OPTIONS.KEY_FILE),
      cert: fs.readFileSync(CONFIG.HTTPS_OPTIONS.CERT_FILE)
    };

    moduleSelf.server.listen(CONFIG.ODATA.PORT, httpsOptions);

  } else {
    log.log('Use HTTP.');
    moduleSelf.server.listen(CONFIG.ODATA.PORT);
  }

  log.log("Server is listening on port " + CONFIG.ODATA.PORT);
};
```


feature 9 (implemented)
---------------------------

Separate out constants (that only are changed when changing the internal
server) from ordinary configuration. Create a file `constants.js` for this.


feature 10 (not implemented)
----------------------------

Cleanup in the tests, `options` not used optimally.
