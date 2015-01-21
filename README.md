Simple OData server for MySQL
==============================


[![Build Status][travis-image]][travis-url]

Introduction
============

Copy `src/setenv.template` to `src/setenv` and update with the database
credentials. Environment variables are used to set admin credentials for the
database and the mail server. The admin database needs to have privileges to
create schemas, users etc. Admin/root is typically used.

Run the tests to make sure everything is ok: `npm install; npm test`.

The simplest way to start the server is: `npm start`. A MySQL server needs to
be running on the same host and port 9000 must not be in use.

The file `src/config.js` contains a number of variables that can be configured.


Getting started
----------------

This will show the API help: `curl http://[IP]:[PORT]/help`.


Run the server using docker
===========================

Prerequisites:

 * docker needs to be installed - I'm using [boot2docker](http://boot2docker.io)

Installation: `docker build --rm -t odataserver .`

Run the container in daemon mode:
`docker run -d -p 81:81 -p 9000:9000 --name odataserver odataserver`.
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

Load some test data with the script `./src-sql/init-mysql2.sh`

Run the extended test suite that depends on the data loaded above:
`npm run-script test2`

Generate the documentation: `npm run-script docco`

Check the code: `npm run-script style`

I'm using editor Atom with the following addons:

    apm install atom-beautify
    apm install linter
    apm install linter-jscs


dtrace
======

The excellent tool `dtrace` can be used for tracing and debugging purposes.
Node and mysql has built in probes, see [howto use](tests/DTRACE.md).

The odata probes are viewed like this:
`sudo dtrace -Z -n 'nodeapp*:::probe{ trace(copyinstr(arg0)); }'``


MS SQL Server - WORK IN PROGRESS
=================================

The `win` folder contains a `package.json` for installation on Windows. The
[mssql module](https://www.npmjs.org/package/mssql) is used instead of the
[mysql module](https://www.npmjs.org/package/mysql). This version don't include support
for BLOB storage in leveldb since the [leveldb package](https://www.npmjs.org/package/leveldb)  
don't support windows.

Run `npm test` to validate that the setup is ok.


Known issues
============

1. Docker build fails during `npm install`. This is rather common and is probably related to problems with the npm package servers. Just build again until it works.


[travis-image]: https://img.shields.io/travis/gizur/odataserver.svg?style=flat
[travis-url]: https://travis-ci.org/gizur/odataserver
