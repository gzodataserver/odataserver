Simple OData server for MySQL
==============================


[![Build Status][travis-image]][travis-url]

Introduction
============

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


Getting started with development
--------------------------------

This will show the API help: `curl http://localhost:9000/help`.


Running the server using docker
===============================

[docker](docker.io) is a virtualization technnique that makes it easy to run
services that are separated from each other. It is also a great way to easily
ensure that development, test and production configurations are identical
(except hardware of course).

Prerequisites:

 * docker needs to be installed - I'm using [boot2docker](http://boot2docker.io)

Build the image: `docker build --rm -t odataserver .`

Run the container in daemon mode:

    docker run -d -p 81:81 -p 9000:9000 -e ADMIN_USER="root" \
    -e ADMIN_PASSWORD="secret" -e MAIL_USER="joe@example.com" \
    -e MAIL_PASSWORD="yyy" --name odataserver odataserver

The ports 81 and 9000 that have been exposed from the container will be routed
from the host to the container using the `-p` flag.

When developing using docker, it is usefull to connect to the containers' shell:

    # Start a container and connect to the shell (without mail settings)
    docker run -t -i --rm -p 81:81 -p 9000:9000 -e ADMIN_USER="root" \
    -e ADMIN_PASSWORD="secret" odataserver /bin/bash

    # Run the tests, MySQL needs to be started manually first
    /usr/bin/mysqld_safe &
    npm test
    ps -ef
    kill <PID for MySQL>

    # Start the services
    supervisord &> /tmp/out.txt &

    # Check that all processes are up
    ps -ef

    # Check that the server is alive
    curl http://localhost:9000/help

    # In a new terminal, check that you can connect to the odataserver
    curl http://[IP]:9000/help

    # Also, check that apache is running
    curl http://[IP]:81/phpMyAdmin-4.0.8-all-languages/

    # NOTE: fetch the ip with `boot2docker ip` if you're running boot2docker


External MySQL
--------------

The included MySQL can be replaced with an external MySQL server. Disable the
internal MySQl server by commenting out the `[program:mysql]` parts with `#` in
`supervisord.conf`.

MySQL credentials are passed as environment variables that are set when
starting the container (the `-e` flag).


Development
===========

Contributions are welcome.

The tests are executed with `npm test`.

Generate the documentation with: `npm run-script docco`

Check the code with: `npm run-script style`



dtrace
======

The excellent tool `dtrace` can be used for tracing and debugging purposes.
Node and mysql has built in probes, see [howto use](tests/DTRACE.md).

The odata probes are viewed like this:
`sudo dtrace -Z -n 'nodeapp*:::probe{ trace(copyinstr(arg0)); }'``


MS SQL Server
=============

_(This is work in progress)_

The `win` folder contains a `package.json` for installation on Windows. The
[mssql module](https://www.npmjs.org/package/mssql) is used instead of the
[mysql module](https://www.npmjs.org/package/mysql). This version don't include
supportfor BLOB storage in leveldb since the
[leveldb package](https://www.npmjs.org/package/leveldb) don't support windows.

Run `npm test` to validate that the setup is ok.


Known issues
============

1. Docker build fails during `npm install`. This is rather common and is
probably related to problems with the npm package servers. Just build again
until it works.


[travis-image]: https://img.shields.io/travis/gizur/odataserver.svg?style=flat
[travis-url]: https://travis-ci.org/gizur/odataserver
