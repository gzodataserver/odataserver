#!/bin/bash
supervisord &
sleep 3
tail -f /var/log/supervisor/supervisord.log -f /var/log/mysql/error.log