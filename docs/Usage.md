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
and granting privileges.


Getting started
===============

1. Create a new account. An account ID will be returned, please note this:
`curl -X POST -v --data "{email: 'joe@example.com'}" http://[IP]:[PORT]/s/create_account`

2. Get a password for joe (this password will be sent by mail in the future):
`curl -X POST -v --data "{accountId: '3ea8f06baf64'}" http://[IP]:[PORT]/s/reset_password`

3. Create one more account. An account ID will be returned, please note this:
`curl -X POST -v --data "{email: 'bill@example.com'}" http://[IP]:[PORT]/s/create_user`

4. Get a password for bill (this password will be sent by mail in the future):
`curl -X POST -v --data "{accountId: '6adb637f9cf2'}" http://[IP]:[PORT]/s/reset_password`

5. Create a new table:
`curl -X POST -v -H "user:3ea8f06baf64" -H "password:xxx" --data "{table_name: 'mytable', columns: ['col1 int','col2 varchar(255)']} " http://[IP]:[PORT]/3ea8f06baf64`

6. Grant privileges for the new table to bill:
`curl -X PUT -v --data "{table_name: 'mytable', accountId: '6adb637f9cf2'}" http://[IP]:[PORT]/3ea8f06baf64/new_table`

7. Insert some data into mytable:
`curl -X POST -v -H "user:3ea8f06baf64" -H "password:xxx" --data "{col1: 11, col2: '11'}" http://[IP]:[PORT]/3ea8f06baf64/mytable`

`curl -X POST -v -H "user:3ea8f06baf64" -H "password:xxx" --data "{col1: 22, col2: '22'}" http://[IP]:[PORT]/3ea8f06baf64/mytable`

8. Get the contents of the new table:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -v http://[IP]:[PORT]/3ea8f06baf64/mytable`

9. Select a one column:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -v http://[IP]:[PORT]/3ea8f06baf64/mytable\?\$select=col2`

10. Get the contents of the new table using bill's credentials:
`curl -H "user:6adb637f9cf2" -H "password:xxx" -v http://[IP]:[PORT]/3ea8f06baf64/mytable`

11. Delete from mytable
`curl -X DELETE -v -H "user:3ea8f06baf64" -H "password:xxx" http://[IP]:[PORT]/3ea8f06baf64/mytable`

12. Check that it's empty:
`curl -H "user:3ea8f06baf64" -H "password:xxx" -v http://[IP]:[PORT]/3ea8f06baf64/mytable`

13. Drop mytable
`curl -X DELETE -v -H "user:3ea8f06baf64" -H "password:xxx" --data "{table_name: 'mytable'}" http://[IP]:[PORT]/3ea8f06baf64`

14. Drop accounts
`curl -X POST -v -H "user:3ea8f06baf64" -H "password:xxx" --data "{accountId: '3ea8f06baf64'}" http://[IP]:[PORT]/s/delete_account`

`curl -X POST -v -H "user:6adb637f9cf2" -H "password:xxx" --data "{accountId: '6adb637f9cf2'}" http://[IP]:[PORT]/s/delete_account`




Troubleshooting
===============

`curl` sometime don't work on localhost when connecting with `localhost` try to
connect with `0.0.0.0:PORT` instead. This problem has nothing to do with
the odataserver though.
