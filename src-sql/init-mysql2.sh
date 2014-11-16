#!/bin/sh

echo "Please enter the username for the admin user followed by [enter]"
read USER

echo "Please enter the password for the admin user followed by [enter]"
read PASSWORD

MYSQL="mysql -u$USER -p$PASSWORD"


#
# Load test database 1
#

DBNAME="wp"
DBUSER="wp"
DBPASSWORD="wp"
SQLFILE="test-wp.sql"

echo "drop database $DBNAME; drop user $DBUSER@'localhost'"
echo "drop database $DBNAME; drop user $DBUSER@'localhost'" | `$MYSQL` || true

echo "create database $DBNAME; create user $DBUSER@'localhost';"
echo "create database $DBNAME; create user $DBUSER@'localhost';" | `$MYSQL`

echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" 
echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | `$MYSQL`

echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES"
echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | `$MYSQL`

echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES"
echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES" | `$MYSQL`

echo "$MYSQL -u$DBUSER -p$DBPASSWORD $DBNAME < ./$SQLFILE"
`$MYSQL -u$DBUSER -p$DBPASSWORD $DBNAME < ./$SQLFILE`


#
# Load test database 2
#

DBNAME="vtigver"
DBUSER="vtiger"
DBPASSWORD="vtiger"
SQLFILE="test-vtiger.sql"

echo "drop database $DBNAME; drop user $DBUSER@'localhost'"
echo "drop database $DBNAME; drop user $DBUSER@'localhost'" | `$MYSQL` || true

echo "create database $DBNAME; create user $DBUSER@'localhost';"
echo "create database $DBNAME; create user $DBUSER@'localhost';" | `$MYSQL`

echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" 
echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | `$MYSQL`

echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES"
echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | `$MYSQL`

echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES"
echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES" | `$MYSQL`

echo "$MYSQL -u$DBUSER -p$DBPASSWORD $DBNAME < ./$SQLFILE"
`$MYSQL -u$DBUSER -p$DBPASSWORD $DBNAME < ./$SQLFILE`


#
# Create stored procedure for testing
#

DBNAME="wp"
DBUSER="wp"
DBPASSWORD="wp"
SQLFILE="sp.sql"

`$MYSQL -u$DBUSER -p$DBPASSWORD $DBNAME < ./$SQLFILE`
