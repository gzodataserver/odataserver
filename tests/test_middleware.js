// template.js
//------------
//
// 2014-12-03, Jonas Colmsjö
//------------------------------
//
// Template for tests
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//


var test = require('tape');
var h = require('../src/helpers.js');

var middleware = require('../src/middleware.js');

var CONSTANTS = require('../src/constants.js');
var log = new h.log0(CONSTANTS.testLoggerOptions);

//
// Whatever setup that is needed
// -----------------------------

test('setUp', function(test) {
  // setup here


  // setup finished
  test.end();
});

//
// Test the middleware class
// -------------------------

test('testing middleware', function(test) {
  test.plan(0);

  var mws = new middleware();

  console.log('# --- nothing should be printed below');
  mws.httpFunc({url: 'http://example.com:9000/first/second?query=query#hash'},{});

  mws.use('/first', function(req, res, next) {
    console.log('# Matched /first - got request: ', req.url);
    next();
  });

  mws.use(function(req, res, next) {
    console.log('# Matched / - got request: ', req.url);
    next();
  });

  mws.use(function(req, res, next) {
    console.log('# Closing response stream');
    if(res.end) {
      res.end();
    }
    next();
  });

  console.log('# --- there should be two lines below');
  mws.httpFunc({url: 'http://example.com:9000/first/second?query=query#hash'},{});

  console.log('# --- there should be one line below');
  mws.httpFunc({url: 'http://example.com:9000/fi/second?query=query#hash'},{});

  console.log('# --- there should be one line below');
  mws.httpFunc({url: 'http://example.com:9000/firsttt/second?query=query#hash'},{});

  console.log('# ---');

  test.end();
});
