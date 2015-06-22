Gizur's OData server for MySQL
==============================


[![Build Status][travis-image]][travis-url]

OData is a protocol that supports JSON. This makes it extremely usefull when
developing web and mobile apps. The Gizur OData Server will serve as your
mobile backend (you won't need any Mobile Backend as a Service, MBaaS). The
server can be used together with any MySQL database.

This is a simple example of how it is used:

```
# Create an account
curl -d '{"email":"jonas@gizur.com"}' http://appdev.gizur.com:9000/create_account

# Reset password. A mail is sent with reset instructions. The password is sent
# in the API response to simplify development. This is turned off in production.
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
from time to time). There is also suport for pictures, text files etc. using
BLOB:s. These are stored in a LevelDB database on the server.
 Run `curl http://appdev.gizur.com:9000/help` to show the help.


Express
-------

OData Server is compatible with express. Install `odataserver` and `express`
(`npm install odataserver express`) and use it like this:

```
var express = require('express');
var config = {
  ODATA: {
    HOST: 'localhost',
    PORT: 9000
  },
  RDBMS: {
    ADMIN_USER: 'root',
    ADMIN_PASSWORD: 'secret'
  }
};
var odataserver = require('odataserver');

var server = new odataserver(config);

var app = express();
server.init(app);

app.listen(config.ODATA.PORT, function() {
  console.log('OData Server listening at http://%s:%s',
              config.ODATA.HOST, config.ODATA.PORT);
});
```

Run `curl http://localhost:9000/help` in a new terminal to verify that the
server is running.


Installation
-----------

1. Make sure that MySQL is up and running and that you have the credentials for
 the admin account (or an account that have privileges to create new databases
  and users).

1. Clone this repo and do `npm install`.

1. Copy `setenv.template` to `setenv` and update it with the database and
mail server credentials. Environment variables are used to set admin credentials
for the database and the mail server.

1. Make sure port 9000 is free and then run: `npm start`.

1. Check that the server is alive with: `curl http://localhost:9000/help`.


More information
---------------

Information regarding [advanced usage and contributing](./ADVANCED.md).


Release history
---------------

Major and minor releases are listed here. Patches are not listed, please see
[Github](https://github.com/gizur/odataserver) for more information.


* 0.1 - Initial release
* 0.2 - Added support for expressjs



[travis-image]: https://travis-ci.org/gizur/odataserver.svg?branch=master
[travis-url]: https://travis-ci.org/gizur/odataserver
