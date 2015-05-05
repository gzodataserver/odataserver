// middleware.js
//---------------
//
// 2015-05-05, Jonas Colmsjö
//--------------------------
//
// Combine middlweware functions into a http server. Any expressjs
// (or connectjs) middleware can be used.
//
//```
// var mws = require('middleware');
//
// mws.use('/first', function(req, res, next) {
//   console.log('Matched /first - got request: ', req.url);
//   next();
// });
//
// mws.use(function(req, res, next) {
//   console.log('Matched / - got request: ', req.url);
//   next();
// });
//
// mws.use(function(req, res, next) {
//   console.log('Closing response stream');
//   res.end();
//   next();
// });
//
// mws.listen(3000);
//```
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//
//

var http = require('http');
var https = require('https');
var url = require('url');
var util= require('util');

// constructor
mws = function() {
  this.mw_ = [];
  this.server_ = null;
}

mws.prototype.httpFunc = function(req, res) {
  var self = this;

  var next = function() {

    if (self.index_ >= self.mw_.length) {
      return;
    }

    var mw = self.mw_[self.index_++];

    // check that the route matches
    if (self.pathname_.substr(0, mw.route.length).toLowerCase() !==
    mw.route.toLowerCase()) {

      next();
      return;
    }
    // make sure path ends with / or . if it is longer than the route
    var c = self.pathname_[mw.route.length];

    if (c !== undefined && c !== '/' && c !== '.' && mw.route !== '/') {
      next();
      return;
    }

    mw.handler(self.req_, self.res_, next);
  }

  self.pathname_ = url.parse(req.url, false, false).pathname;
  self.req_ = req;
  self.res_ = res;

  // make sure there is a slash in the begininng
  if (self.pathname_[0] !== '/') {
    self.pathname_ = '/' + self.pathname_;
  }

  self.index_ = 0;
  next();
};

//
// Public functions
// ----------------

mws.prototype.use = function(route, handler) {
  var self = this;

  if(typeof route !== 'string') {
    handler = route;
    route = '/';
  }

  // remove trailing slash if there is one
  if(route.length > 1 && route[route.length-1] === '/') {
    route = route.substring(0, route.length-1);
  }

  self.mw_.push({route: route, handler: handler});
}

mws.prototype.listen = function(port, options) {
  var self = this;

  if (options) {
    self.server_ = https.createServer(options, self.httpFunc.bind(self))
  } else {
    self.server_ = http.createServer(self.httpFunc.bind(self));
  }

  self.server_.listen(port);
}

mws.prototype.close = function() {
  this.server_.close()
};

module.exports = mws;
