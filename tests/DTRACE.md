My notes about using dtrace for debugging and tracing
======================================================


Good overview of dtrace: http://www.tablespace.net/quicksheet/dtrace-quickstart.html


nodejs
----

Use nhttpsnoop to generate dtrace script for the nodejs http api and the garbage
collection. I added this line at the end to show the temporary script it generates:
`echo "dtrace $DTRACE_OPTS -Z -Cs $nhs_tmpfile"`


It is also possible to add your own dtrace probes using this
[nodejs dtrace provider](https://github.com/chrisa/node-dtrace-provider).


mysql
----

MySQL also have support for dtrace. This will show all available probes:

`sudo dtrace -Z -n 'mysql*:::*{ trace(arg0); trace(arg1) }'`
