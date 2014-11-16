#!/bin/bash
cd ../src
npm install
cd ../src-sql
./init-mysql2.sh
cd ../tests
npm install
./node_modules/.bin/nodeunit test_*.js
