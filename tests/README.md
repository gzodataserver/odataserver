OData server tests
=================

Make sure a instance of the odatamysql server is running before running the tests.
Also update the IP address in `test.js`.

Install nodeunit: `npm install`

Run tests: `./node_modules/.bin/nodeunit test_*.js`

The `./runtests.sh` script will reset the database and then run the tests.
This is the best way to run the tests with predictable results.
