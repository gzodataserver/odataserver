#!/bin/bash

source setenv
node -e 'var m=require("odataserver"); (new m({})).start();'
