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

    // setup here
    this.mysqlodata = require('../src/main.js');

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
  // Test the etag function
  // -----------------------


  'testing etag': function(test) {
    var expected = {
      "key1": "val1",
      "key2": "val2",
      "@odata.etag": "f2a47ef58c1564593e6313924c79f6d4"
    };
    var o = this.mysqlodata.addEtag({
      'key1': 'val1',
      'key2': 'val2'
    });
    test.deepEqual(o, expected, 'ETAG not what we expected');
    test.done();
  },

};
