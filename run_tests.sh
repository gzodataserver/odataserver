#!/bin/bash

source setenv
echo "#NOTE: Redirecting stderr to /dev/null"
node tests/test_main.js && node tests/test_leveldb.js && node tests/test_mysql.js 2> /dev/null
