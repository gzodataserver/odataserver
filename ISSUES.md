Issues
======


issue1
------

The tests do not terminate at test 24:

```
ok 23 incorrect admin operation
# testing create bucket
:{"code":"ER_TABLE_EXISTS_ERROR","errno":1050,"sqlState":"42S01","index":0}
ok 24 create bucket
# testing write to bucket
```
