Gizur's OData server for MySQL
==============================


[![Build Status][travis-image]][travis-url]


Copy `setenv.template` to `setenv` and update with the database and
mail server credentials. Environment variables are used to set admin credentials
for the database and the mail server. The admin database needs to have
privileges to create schemas, users etc. Admin/root is typically used.

A (insecure) self-signed certificate is used for development and testing. Run
`bin/gencert.sh` to generate a key and certificate. There are many vendors that
sells certificates for production use.

Make sure that MySQL is running and that port 9000 is free and then run the
tests: `npm install; npm test`.

Now start the server with: `npm start`. Check that it is alive with:
`curl http://localhost:9000/help`.

The file `config.js` contains a number of variables that can be configured.
Check it out, it is fairly well documented. Make sure to change the flag
`RESET_PASSWORD_WITHOUT_LINK` for production use (all accounts on the server are
 open for anyone otherwise).



This will show the API help: `curl http://localhost:9000/help`.


Information regarding [advanced usage and contributing](./ADVANCED.md).


[travis-image]: https://img.shields.io/travis/gizur/odataserver.svg?style=flat
[travis-url]: https://travis-ci.org/gizur/odataserver
