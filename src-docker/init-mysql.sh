#!/bin/sh

/usr/sbin/mysqld &
sleep 5
echo "GRANT ALL ON *.* TO admin@'%' IDENTIFIED BY 'mysql-server' WITH GRANT OPTION; FLUSH PRIVILEGES" | mysql
echo "GRANT ALL ON *.* TO admin@'localhost' IDENTIFIED BY 'mysql-server' WITH GRANT OPTION; FLUSH PRIVILEGES" | mysql


#
# Load test database 1
#

echo "create database gizur_com; create user gizur_com;" | mysql
echo "grant usage on *.* to 'gizur_com'@'%' identified by '48796e76'; FLUSH PRIVILEGES" | mysql
echo "grant usage on *.* to 'gizur_com'@'localhost' identified by '48796e76'; FLUSH PRIVILEGES" | mysql
echo "grant all privileges on gizur_com.* to 'gizur_com'@'%'; FLUSH PRIVILEGES" | mysql
mysql -ugizur_com -p48796e76 gizur_com < /src/test-wp.sql


#
# Load test database 1
#

DBNAME="wp"
DBUSER="wp"
DBPASSWORD="wp"
SQLFILE="test-wp.sql"

echo "create database $DBNAME; create user $DBUSER;" | mysql
echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | mysql
echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | mysql
echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES" | mysql
mysql -u$DBUSER -p$DBPASSWORD $DBNAME < /src/$SQLFILE


#
# Load test database 2
#

DBNAME="vtigver"
DBUSER="vtiger"
DBPASSWORD="vtiger"
SQLFILE="test-vtiger.sql"

echo "create database $DBNAME; create user $DBUSER;" | mysql
echo "grant usage on *.* to '$DBUSER'@'%' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | mysql
echo "grant usage on *.* to '$DBUSER'@'localhost' identified by '$DBPASSWORD'; FLUSH PRIVILEGES" | mysql
echo "grant all privileges on $DBNAME.* to '$DBUSER'@'%'; FLUSH PRIVILEGES" | mysql
mysql -u$DBUSER -p$DBPASSWORD $DBNAME < /src/$SQLFILE

