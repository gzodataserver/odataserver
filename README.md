Gizur's OData server for MySQL
==============================


[![Build Status][travis-image]][travis-url]

OData is a protocol that supports JSON. This makes it extremely usefull when
developing web and moile apps. The Gizur OData Server can be used together with
any MySQL database.

This simple example of how it is used:

```
curl -d '{"email":"jonas@gizur.com"}' http://appdev.gizur.com:9000/create_account

# A mail is sent with reset instructions. The password is sent in the API
# response to simplify development. This is turned off in production.
curl -d '{"accountId":"0b213a639078","email":"jonas@gizur.com"}' http://appdev.gizur.com:9000/0b213a639078/s/reset_password

# create a new table
curl -H "user: 0b213a639078" -H "password: xxx" -d '{"tableDef":{"tableName":"mytable","columns":["col1 int","col2 varchar(255)"]}}' http://appdev.gizur.com:9000/0b213a639078/s/create_table

# insert some data
curl -H "user: 0b213a639078" -H "password: xxx" -d '{"col1":11,"col2":"11"}' http://appdev.gizur.com:9000/0b213a639078/mytable

# get the data just inserted
curl -H "user: 0b213a639078" -H "password: xxx"  http://appdev.gizur.com:9000/0b213a639078/mytable
```

This example is using our development server. It is open, feel free to test
around (we give no guarantees regarding up-time and the database is reset
from time to time). Run `curl http://appdev.gizur.com:9000/help` to show
the help.


Installation
-----------

1. Make sure that MySQL is up and running and that you have the credentials for
 the admin account (or an account that have privileges to create new databases
  and users).

1. Clone this repo.

1. Copy `setenv.template` to `setenv` and update with the database and
mail server credentials. Environment variables are used to set admin credentials
for the database and the mail server.

1. A (insecure) self-signed certificate is used for development and testing. Run
`bin/gencert.sh` to generate a key and certificate. There are many vendors that
sells certificates for production use.

1. Make sure port 9000 is free and then run: `npm install` follow by
 `npm start`.

1. Check that the server is alive with: `curl http://localhost:9000/help`.

1. The file `config.js` contains a number of variables that can be configured.
Check it out, it is fairly well documented. Make sure to change the flag
`RESET_PASSWORD_WITHOUT_LINK` for production use (all accounts on the server are
 open for anyone otherwise).


More information
---------------

Information regarding [advanced usage and contributing](./ADVANCED.md).


[travis-image]: https://img.shields.io/travis/gizur/odataserver.svg?style=flat
[travis-url]: https://travis-ci.org/gizur/odataserver
