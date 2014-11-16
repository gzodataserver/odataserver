#!/bin/bash

echo `date` ": batches executed"  >> /var/log/supervisor/supervisord.log

/var/www/html/vtigercrm/recalc_privileges.php >> /var/log/supervisor/supervisord.log