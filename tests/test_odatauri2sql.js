// test_odatauri2sql.js
//------------------------------
//
// 2014-11-15, Jonas Colmsjö
//
//------------------------------
//
// Template for tests
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//
// Run like this: `./node_modules/.bin/nodeunit test_odatauri2sql.js`
// Install dependencies first: `npm install`

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/


exports['test.odatauri2sql'] = {

  //
  // Some Uris to test with
  // ---------------------

  setUp: function(done) {
    var self=this;

    self.o2s = require('../src/odatauri2sql.js');
    self.h = require('../src/helpers.js');
    self.h.debug = true;

    // Incorrect URLs
    this.ic = [];
    this.ic.push('http://localhost/xyz/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2');
    this.ic.push('http://localhost/schema/table(2)');

    // Correct URLs
    this.c = [];
    this.c.push('http://localhost/schema/table?$select=col1,col2&$filter=co1 eq "help"&$orderby=col2&$skip=10');
    this.c.push('http://localhost/schema/table');
    this.c.push('http://localhost/schema/table?$select=col1,col2&$filter=Price add 5 gt 10&$orderby=col2');
    this.c.push('http://localhost/schema/table?$orderby=col2');


    // setup finished
    done();
  },


  //
  // Test GET/SELECT Uris
  // ---------------------

  'testing odatauri2sql.ODataUri2Sql GET': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    test.expect(6);

    var expected = [];
    expected.push('{"query_type":"select","schema":"schema","sql":"select col1,col2 from schema.table where co1 = \\"help\\" order by col2 limit 10,100"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select * from schema.table"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select col1,col2 from schema.table where Price + 5 > 10 order by col2"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select * from schema.table order by col2"}');


    for (var i = 0; i < this.c.length; i++) {
      var o = uriParser.parseUri(this.c[i], 'GET');

      test.equal(JSON.stringify(o),
        expected[i],
        this.c[i]);
    }

    for (i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.ic[i]);
      });
    }

    test.done();

  },


  //
  // Test POST/INSERT Uris
  // ---------------------

  'testing odatauri2sql.ODataUri2Sql POST': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    test.expect(6);

    for (var i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.ic[i], 'POST');
      });
    }

    for (i = 0; i < this.c.length; i++) {
      test.throws(function() {
        uriParser.parseUri(this.c[i], 'POST');
      });
    }

    test.done();

  },

  //
  // Test the etag function
  // -----------------------


  'testing etag': function(test) {
    var self=this;
    var uriParser = new self.o2s.ODataUri2Sql();

    var expected = {
      "key1": "val1",
      "key2": "val2",
      "@odata.etag": "f2a47ef58c1564593e6313924c79f6d4"
    };
    var o = uriParser.addEtag({
      'key1': 'val1',
      'key2': 'val2'
    });
    test.deepEqual(o, expected, 'ETAG not what we expected');
    test.done();
  },

};
