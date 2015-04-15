A small test for CORS requests
==============================

It is necessary to serve the HTML from a web-server to the browser to test
that CORS is setup correctly.

The headers `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers` should be returned when
CORES is enabled in the ODataServer. The result using `curl` should look like this:

```
$curl -v http://localhost:9000/0b213a639078/b_rootapp
* Hostname was NOT found in DNS cache
*   Trying 127.0.0.1...
* Connected to localhost (127.0.0.1) port 9000 (#0)
> GET /0b213a639078/b_rootapp HTTP/1.1
> User-Agent: curl/7.37.1
> Host: localhost:9000
> Accept: */*
> 
< HTTP/1.1 406 Not Acceptable
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept
< Content-Type: application/json
< Date: Wed, 15 Apr 2015 11:45:14 GMT
< Connection: keep-alive
< Transfer-Encoding: chunked
< 
* Connection #0 to host localhost left intact
{"d":{"error":"Cannot read from bucket: Error: ER_DBACCESS_DENIED_ERROR: Access denied for user ''@'localhost' to database '0b213a639078'. See /help for help."}}
```

How to run the tests
--------------------

* Start the web server: `node static-web-server.js`
* Open a browser and run the test by opening `http://127.0.0.1:8125` 

The result should look like this (it is an error but NOT a Access-Control-Allow-Origin error):

```
[Error] Failed to load resource: the server responded with a status of 406 (Not Acceptable) (b_rootapp, line 0)
[Error] TypeError: null is not an object (evaluating 'text.match('<title>(.*)?</title>')[1]')
```


The console in the browser looks like this when CORS isn't setup correctly:

```
[Log] DOMContentLoaded (index.html, line 7)
[Error] XMLHttpRequest cannot load http://localhost:9000/0b213a639078/b_rootapp. Origin http://127.0.0.1:8125 is not allowed by Access-Control-Allow-Origin. (index.html, line 0)
```
