#!/bin/bash

source setenv
node -e 'var m=require("./src/main.js"); (new m({})).start();'
