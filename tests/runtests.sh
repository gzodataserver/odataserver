#!/bin/bash
cd ../src-sql
./init-mysql2.sh
cd ../tests
./node_modules/.bin/nodeunit test.js
