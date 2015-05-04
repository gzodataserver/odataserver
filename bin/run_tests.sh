#!/bin/bash

if test -e setenv; then
  echo "sourcing setenv..."
  source setenv
fi

echo "#NOTE: Redirecting stderr to /dev/null"
node tests/test_main.js && node tests/test_leveldb.js && \
node tests/test_mysql2.js && node tests/test_odataserver.js && \
node tests/test_helpers.js # don't redirtct  2> /dev/null
