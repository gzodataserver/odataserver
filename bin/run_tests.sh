#!/bin/bash

source setenv
echo "#NOTE: Redirecting stderr to /dev/null"
node tests/test_main.js && node tests/test_leveldb.js && \
node tests/test_mysql.js && node tests/test_odataserver.js && \
node tests/test_helpers.js 2> /dev/null
