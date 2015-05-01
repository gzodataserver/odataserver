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


