Some notes regarding advanced usage and development of Gizur's OData Server
==========================================================================


Running the server using docker
===============================

[docker](docker.io) is a virtualization technnique that makes it easy to run
services that are separated from each other. It is also a great way to easily
ensure that development, test and production configurations are identical
(except hardware of course).

Prerequisites:

 * docker needs to be installed - I'm using [boot2docker](http://boot2docker.io)

Build the image: `docker build --rm -t odataserver .`

Create an environment definitions file called `env.list`
(copy `env.list.template` and edit).

Make sure a container with rsyslog is running (skip the `--link` part if you
don't have this).. I'm using this container:  
  [beservices](https://github.com/gizur/beservices).


Run the container in on a server (assuming a proxy server used, see development
below is this isn't the case):

    docker run -t -i --env-file=env.list --restart="on-failure:10" \
    --link beservices:beservices --name odataserver -p 9000:9000  \
    -h odataserver odataserver /bin/bash -c "supervisord; bash"

Exit the shell with `ctrl-p` `ctrl-q`. `exit` will stop the container.

When developing using docker, it is usefull to connect to the containers' shell:

    # Start a container like this in order not to start supervisord
    docker run -t -i -p 9000:9000 -p 83:81 --env-file=env.list --name odataserver \
    odataserver /bin/bash

    # Run the tests, MySQL needs to be started manually first
    /usr/bin/mysqld_safe &
    npm test
    ps -ef
    kill <PID for MySQL>

    # Start the services
    supervisord &

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
starting the container (the `--env-file` flag).


Support for SSL
==============

A (insecure) self-signed certificate is used for development and testing. Run
`bin/gencert.sh` to generate a key and certificate. There are many vendors that
sells certificates for production use. SSL is turned on in `config.js`


Development
===========

Contributions are welcome.

The tests are executed with `npm test`.

Generate the documentation with: `npm run-script docco`

Check the code with: `npm run-script style`

The ports 81 and 9000 that have been exposed from the container will be routed
from the host to the container using the `-p` flag.



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


Notes and known issues
======================

1. Docker build fails during `npm install`. This is rather common and is
probably related to problems with the npm package servers. Just build again
until it works.

2. Running phpMyAdmin behind a reverse proxy, see
   [this](https://wiki.phpmyadmin.net/pma/Config/PmaAbsoluteUri)

3. Allow login in phpMyAdmin without password by adding this to config.inc.php: `$cfg['Servers'][$i]['AllowNoPassword'] = TRUE;`


4. Setup an anonymous user (without password) with read-only access:

```
# Check if an anonymous user exists. This user has blank username and password
select user,password,host from mysql.user;

# This gives read-only access to all accounts. Replace with the accountid
# to limit this
grant select on *.* to ''@'localhost'
```

Now test to login to mysql (or phpMyAdmin) with username `anonymous`
without a password.

A blank accountId should be used in the API, see example below:

```
# see http://localhost:900/help for info about how to create the account and tables used here
curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"tableName":"mytable","accountId":""}' http://localhost:9000/3ea8f06baf64/s/grant

curl  http://localhost:9000/3ea8f06baf64/mytable
```

5. Running `npm` gives `Error: Can't render headers after they are sent to the client.`
   Delete the test user and database in mysql.
