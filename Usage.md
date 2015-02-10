Introduction
============

The purpose of this project is to provide a simple API for development of mobile
and web apps. The goal is to provide everything needed in a backend to let
developers focus on the front-end development. The API mimics the odata protocol
but it is not a full implementation. Only JSON is for instance supported. The
API also provides a number of functions for creating users and managing
priviledges which isn't available in the OData specification.

Writing clients for the odataserver is simple. The REST API provides CRUD
operations for entities and also administrative tasks like creating users
and granting privileges. There is also a simple key/value store which is meant
to be used for large texts and BLOBs. It can be used for any data though.


Getting started
===============

This section illustrates howto use the API with the command line tool `curl`.
The examples should be easy to translate to arbitrary programming language that
support HTTP REST operations.

1. Create a new account. An account ID will be returned, please note this:
`curl -d '{"email":"joe@example.com"}' http://[IP]:[PORT]/create_account`

2. Get a password for joe:
`curl -d '{"accountId":"3ea8f06baf64","email":"joe@example.com"}' http://[IP]:[PORT]/3ea8f06baf64/s/reset_password`

Use the link in the mail to get the new password:
`curl http://[IP]:[PORT]/3ea8f06baf64/s/reset_password/[reset password token]`


3. Create one more account. An account ID will be returned, please note this:
`curl -d '{"email":"bill@example.com"}' http://[IP]:[PORT]/s/create_account`

4. Get a password for bill:
`curl -d '{"accountId":"6adb637f9cf2","email":"bill@example.com"}' http://[IP]:[PORT]/6adb637f9cf2/s/reset_password`

Use the link in the mail to get the new password:
`curl http://[IP]:[PORT]/reset_password/[reset password token]`


Work with tables
----------------

1. Create a new table:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"tableDef":{"tableName":"mytable","columns":["col1 int","col2 varchar(255)"]}}' http://[IP]:[PORT]/3ea8f06baf64/s/create_table`

1. Get list of tables:
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64`

2. Grant privileges for the new table to bill:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"tableName":"mytable","accountId":"6adb637f9cf2"}' http://[IP]:[PORT]/3ea8f06baf64/s/grant_privs`

3. Insert some data into mytable:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"col1":11,"col2":"11"}' http://[IP]:[PORT]/3ea8f06baf64/mytable`

`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"col1":22,"col2":"22"}' http://[IP]:[PORT]/3ea8f06baf64/mytable`

4. Get the contents of the new table:
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable`

5. Select a one column:
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable\?\$select=col2`

6. Get the contents of the new table using bill's credentials:
`curl -H "user:6adb637f9cf2" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable`

7. Delete from mytable
`curl -X DELETE -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable`

8. Check that it's empty:
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable`

9. Drop mytable
`curl -X DELETE -H "user:3ea8f06baf64" -H "password:xxx" -d '{"tableName":"mytable"}' http://[IP]:[PORT]/3ea8f06baf64/s/drop_table`



Work with BLOBs
---------------

Buckets are key/value stores for BLOBs. A `POST` operation writes and `GET`
operation will read the result. Buckets value ara managed using versions. It is
always possible to see the full history of a key. There is not `DELETE`
operation. Just write a empty value instead.

Bucket names must begin with the prefix `b_`. This means that tables cannot
begin with `b_`. Privileges for buckets are manages with the same API functions
as tables.

1. Create a new bucket:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"bucketName":"b_mybucket"}' http://[IP]:[PORT]/3ea8f06baf64/s/create_bucket`

2. Store a BLOB in mybucket:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d "Just some test data to store in the bucket" http://[IP]:[PORT]/3ea8f06baf64/b_mybucket`

`curl -H "user:3ea8f06baf64" -H "password:xxx" -d "New version with some test to store in the bucket" http://[IP]:[PORT]/3ea8f06baf64/b_mybucket`

3. Get the contents of the bucket:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -v http://[IP]:[PORT]/3ea8f06baf64/b_mybucket`

4. Grant privileges for the new bucket to bill:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -d '{"name":"b_mybucket","accountId":"6adb637f9cf2"}' http://[IP]:[PORT]/3ea8f06baf64/s/grant_privs`

5. Get the contents of the new table using bill's credentials:
`curl -H "user:6adb637f9cf2" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/b_mybucket`

6. Drop mybucket
`curl -X DELETE -H "user:3ea8f06baf64" -H "password:xxx" -d '{"bucketName":"b_mybucket"}' http://[IP]:[PORT]/3ea8f06baf64/s/drop_bucket`


Servcie definitions
-------------------


1. Get list of tables
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64`

2. Get table definition
`curl -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable/\$metadata`


Clean up
---------

1. Drop accounts
`curl -X POST -H "user:3ea8f06baf64" -H "password:xxx" -d '{"accountId":"3ea8f06baf64"}' http://[IP]:[PORT]/3ea8f06baf64/s/delete_account`

`curl -X POST -H "user:6adb637f9cf2" -H "password:xxx" -d '{"accountId":"6adb637f9cf2"}' http://[IP]:[PORT]/6adb637f9cf2/s/delete_account`




Troubleshooting
===============

`curl` sometime don't work on localhost when connecting with `localhost:PORT` try to
connect with `0.0.0.0:PORT` instead. This problem has nothing to do with
the odataserver.

Use the option `-v` with `curl` when debugging your calls.
