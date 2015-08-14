#!/bin/bash

source setenv
cd /odataserver
node -e 'var m=require("odataserver"); (new m({})).start();'
