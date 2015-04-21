#!/bin/bash
source ../setenv
echo "drop database aebba2907b1f;drop user 'aebba2907b1f'@'localhost';" | mysql -u$ADMIN_USER -p$ADMIN_PASSWORD
echo "drop database 06f1c7f825bc;drop user '06f1c7f825bc'@'localhost';"  | mysql -u$ADMIN_USER -p$ADMIN_PASSWORD

