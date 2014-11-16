//
// Unit tests
//
// curl --header 'user: wp' --header 'password: wp' http://localhost:80/wp
// curl --header 'user: wp' --header 'password: wp' http://localhost:80/wp/wp_links?$orderby=link_id
// curl --header 'user: wp' --header 'password: wp' -X POST --data '{data}' http://hostname
//


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



// Unit test
//-------------------------------------------------------------------------------------------------
// Basic tests

exports['test.odatamysql'] = {

  setUp: function(done) {

    // IMPORTANT: UPDATE THIS IP ADDRESS BEFORE RUNNING THE TESTS

    // path and method is set in each test
    this.options = {
      //			hostname: '192.168.59.103',
      hostname: 'localhost',
      port: 80,
      headers: {
        user: 'wp',
        password: 'wp'
      }
    };

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

  'testing mysqlodata.parseGetQuery': function(test) {

    test.expect(6);

    var expected = [];
    expected.push('{"query_type":"select","schema":"schema","sql":"select col1,col2 from schema.table where co1 = \\"help\\" order by col2 limit 10,100"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select * from schema.table"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select col1,col2 from schema.table where Price + 5 > 10 order by col2"}');
    expected.push('{"query_type":"select","schema":"schema","sql":"select * from schema.table order by col2"}');


    for (var i = 0; i < this.c.length; i++) {
      var o = this.mysqlodata.parseURI(this.c[i], 'GET');

      test.equal(JSON.stringify(o),
        expected[i],
        this.c[i]);
    }

    for (i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        this.mysqlodata.parseGetQuery(this.ic[i]);
      });
    }

    test.done();

  },

  'testing simple GET': function(test) {
    var http = require('http');

    var expected = {
      value: [{
        link_id: 1,
        link_url: "http://codex.wordpress.org/",
        link_name: "Documentation",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "75a79d6b59e17fb4c11a04c4b9187644"
      }, {
        link_id: 2,
        link_url: "http://wordpress.org/news/",
        link_name: "WordPress Blog",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "http://wordpress.org/news/feed/",
        "@odata.etag": "6da53c8dffc1e367d0f8d16111f77c27"
      }, {
        link_id: 3,
        link_url: "http://wordpress.org/support/",
        link_name: "Support Forums",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "6b6e932a73230d4cd6e1a4c357d31e22"
      }, {
        link_id: 4,
        link_url: "http://wordpress.org/extend/plugins/",
        link_name: "Plugins",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "d2bb724531ec90db4e930a2b2d93b50d"
      }, {
        link_id: 5,
        link_url: "http://wordpress.org/extend/themes/",
        link_name: "Themes",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "9f2eb495901f729108964b217d251faa"
      }, {
        link_id: 6,
        link_url: "http://wordpress.org/support/forum/requests-and-feedback",
        link_name: "Feedback",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "b89f78b689f88d835a9ebd2d98f0525d"
      }, {
        link_id: 7,
        link_url: "http://planet.wordpress.org/",
        link_name: "WordPress Planet",
        link_image: "",
        link_target: "",
        link_description: "",
        link_visible: "Y",
        link_owner: 1,
        link_rating: 0,
        link_updated: "0000-00-00 00:00:00",
        link_rel: "",
        link_notes: "",
        link_rss: "",
        "@odata.etag": "422422e0f45f69272825fa878a12816c"
      }]
    };


		test.expect(1);

    this.options.method = 'GET';
    this.options.path = '/wp/wp_links?$orderby=link_id';

    var data = '';

    var req = http.request(this.options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        data += chunk;
      });

			res.on('end', function() {
				test.deepEqual(expected, JSON.parse(data), 'GET did not return what was expected');
				//console.log('DATA: ' + data);
				test.done();
			})
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

		req.end();

  },

  'testing service definition': function(test) {
    var http = require('http');

    test.expect(1);

    var expected = {
      value: [{
        name: "wp_commentmeta",
        url: "wp_commentmeta",
        "@odata.etag": "abcc366456f680a490c934c569925c54"
      }, {
        name: "wp_comments",
        url: "wp_comments",
        "@odata.etag": "dc846e5fcf2071e15ba0349c9fe54d1d"
      }, {
        name: "wp_links",
        url: "wp_links",
        "@odata.etag": "ab416f5f8b0d58c919bc83a60c6a63e8"
      }, {
        name: "wp_options",
        url: "wp_options",
        "@odata.etag": "1b49550b74c625226a557fc04733e62a"
      }, {
        name: "wp_postmeta",
        url: "wp_postmeta",
        "@odata.etag": "6c02d1aec306cac2a0bdb259b43f74fa"
      }, {
        name: "wp_posts",
        url: "wp_posts",
        "@odata.etag": "57ead45f899d2dfd3f8062b1ab41c0be"
      }, {
        name: "wp_term_relationships",
        url: "wp_term_relationships",
        "@odata.etag": "0705634ea13b69b5f6b417044bcabb36"
      }, {
        name: "wp_term_taxonomy",
        url: "wp_term_taxonomy",
        "@odata.etag": "8bb51e44a7790329f36edd5452d49dfb"
      }, {
        name: "wp_terms",
        url: "wp_terms",
        "@odata.etag": "5bf429d7db432e48a4ebb97d5f05874c"
      }, {
        name: "wp_usermeta",
        url: "wp_usermeta",
        "@odata.etag": "0a18755e2831e1541a578ebc23824b41"
      }, {
        name: "wp_users",
        url: "wp_users",
        "@odata.etag": "c0c1771a2c33a7c57fa89529b8105802"
      }]
    };

    this.options.method = 'GET';
    this.options.path = '/wp';

    var data = '';

    var req = http.request(this.options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        data += chunk;
      });

			res.on('end', function() {
				test.deepEqual(expected, JSON.parse(data), 'GET did not return what was expected');
				test.done();
			})
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.end();

  },

  'testing mysqlodata.parsePostQuery': function(test) {

    test.expect(6);

    for (var i = 0; i < this.ic.length; i++) {
      test.throws(function() {
        this.mysqlodata.parseURI(this.ic[i], 'POST');
      });
    }

    for (i = 0; i < this.c.length; i++) {
      test.throws(function() {
        this.mysqlodata.parseURI(this.c[i], 'POST');
      });
    }

    //var o = this.mysqlodata.parseURI('http://localhost/schema/table', 'POST');

    test.done();

  },

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

  'testing POST and DELETE operations': function(test) {

		var self = this;

    // Test POST
    // -----------

    var http = require('http');

    test.expect(2);

    this.options.method = 'POST';
    this.options.path = '/wp/wp_links';

    var wpLink = {
      "link_id": 8,
      "link_url": "http://planet.wordpress.org/",
      "link_name": "WordPress Planet",
      "link_image": "",
      "link_target": "",
      "link_description": "",
      "link_visible": "Y",
      "link_owner": 1,
      "link_rating": 0,
      "link_updated": "0000-00-00 00:00:00",
      "link_rel": "",
      "link_notes": "",
      "link_rss": ""
    };

    var data = '';

    var req = http.request(this.options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        data += chunk;
      });

			// pass the options into the close callback
			res.on('end', function() {
				console.log('POST received: ' + data);
				test.ok(true, 'Did not receive what we expected.');


				// Test DELETE
				// -----------
				var filter = require("querystring").stringify({
					$filter: 'link_id eq 8'
				});

				// modify the options (hostname, port and headers are the same)
				self.options.path = '/wp/wp_links?' + filter;
				self.options.method = 'DELETE';

				data = '';

				var req = http.request(self.options, function(res) {
					res.setEncoding('utf8');

					res.on('data', function(chunk) {
						data += chunk;
					});

					res.on('end', function() {
						console.log('DELETE received: ' + data);
						test.ok(true, 'Did not receive what we expected.');
						test.done();
					});

				});

				req.on('error', function(e) {
					console.log('problem with request: ' + e.message);
				});

				req.end();

			});

    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });



    // write data to request body
    req.write(JSON.stringify(wpLink));

    req.end();
  },

  'testing POST on service definition (create table)': function(test) {

    var http = require('http');

    test.expect(1);

    this.options.method = 'POST';
    this.options.path = '/wp';

    var tableDef = {
      table_name: 'new_table',
      columns: [
        'id int not null auto_increment primary key',
        'int_col int',
        'float_col float',
        'char_col varchar(255)',
        'boolean bit(1)'
      ]
    };

    // the id column is automatically set
    var tableData = {
      int_col: 1234567,
      float_col: 12.34567,
      char_col: "one two three four five six seven",
      boolean: 0,
    };


    var data = '';

    var req = http.request(this.options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        data += chunk;
      });

			res.on('end', function() {
				test.ok(true, 'XXX');
				console.log('DATA received: ' + data);
				test.done();
			});

    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(tableDef));

    req.end();

  },


};
