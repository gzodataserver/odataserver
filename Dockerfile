# OData producer on top of MySQL and Apache
#
# VERSION               0.0.1

FROM       ubuntu:trusty

# Format: MAINTAINER Name <email@addr.ess>
MAINTAINER Jonas Colmsjö <jonas@gizur.com>

RUN echo "export HOME=/root" >> /root/.profile

# Mirros: http://ftp.acc.umu.se/ubuntu/ http://us.archive.ubuntu.com/ubuntu/
RUN echo "deb http://ftp.acc.umu.se/ubuntu/ trusty-updates main restricted" > /etc/apt/source.list
RUN apt-get update
RUN apt-get install -y wget nano curl git


#
# Install supervisord (used to handle processes)
# ----------------------------------------------
#
# Installation with easy_install is more reliable. apt-get don't always work.

RUN apt-get install -y python python-setuptools
RUN easy_install supervisor

ADD ./src-docker/etc-supervisord.conf /etc/supervisord.conf
ADD ./src-docker/etc-supervisor-conf.d-supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN mkdir -p /var/log/supervisor/


#
# Install rsyslog
# ---------------
#

RUN apt-get -y install rsyslog
RUN mv /etc/rsyslog.conf /etc/rsyslog.conf.org
ADD ./src-docker/etc-rsyslog.conf /etc/rsyslog.conf


#
# Install cron
# ------------

# Test to update the server automatically periodically (need to find a way to restart the server also)
# Just comment this section out to turn it off
#RUN echo '*/90 * * * *  /bin/bash -c "date > last-run.txt; npm install -g odataserver > ./install.log;source /tmp/odataserver.pid; kill $PID"' > /mycron
#RUN crontab /mycron

#ADD ./src-docker/etc-pam.d-cron /etc/pam.d/cron


#
# Install Apache
# ---------------

RUN apt-get install -y apache2 php5 php5-curl php5-mysql php5-mcrypt
RUN a2enmod rewrite status
ADD ./src-docker/etc-apache2-apache2.conf /etc/apache2/apache2.conf
ADD ./src-docker/etc-apache2-ports.conf /etc/apache2/ports.conf
ADD ./src-docker/etc-apache2-mods-available-status.conf /etc/apache2/mods-available/status.conf
ADD ./src-docker/etc-apache2-sites-available-000-default.conf /etc/apache2/sites-available/000-default.conf

RUN rm /var/www/html/index.html
RUN echo "<?php\nphpinfo();\n " > /var/www/html/info.php

# Install phpMyAdmin
ADD ./src-phpmyadmin/phpMyAdmin-4.0.8-all-languages.tar.gz /var/www/html/
ADD ./src-phpmyadmin/phpMyAdmin-4.3.12-all-languages.tar.gz /var/www/html/
ADD ./src-phpmyadmin/config.inc.php /var/www/html/phpMyAdmin-4.0.8-all-languages/config.inc.php
ADD ./src-phpmyadmin/config.inc.php /var/www/html/phpMyAdmin-4.3.12-all-languages/config.inc.php


#
# Install NodeJS
# --------------

RUN apt-get install -y build-essential g++

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.13.1/install.sh | bash
# RUN echo "[ -s $HOME/.nvm/nvm.sh ] && . $HOME/.nvm/nvm.sh" >> $HOME/.profile
RUN /bin/bash -c "source $HOME/.profile && nvm install v0.12.2 && nvm alias default v0.12.2"

ADD ./src-docker/init-node.sh /src/
RUN /src/init-node.sh


#
# Install MySQL
# -------------

# init script and test db
ADD ./src-docker/init-mysql.sh /src/
#ADD ./src-sql/test-wp.sql /src/
#ADD ./src-sql/test-vtiger.sql /src/

# Install MySQL server
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Fix configuration
RUN sed -i -e"s/^bind-address\s*=\s*127.0.0.1/bind-address = 0.0.0.0/" /etc/mysql/my.cnf

# Setup admin user
RUN /src/init-mysql.sh


#
# Add source for the odatamysql server
# ------------------------------------

# not used anymore ADD ./bin/start.sh /
ADD ./server.key /
ADD ./server.cer /

#ADD ./package.json /
#ADD ./bin/run_tests.sh /bin/
#ADD ./bin/start.sh /bin/
#ADD ./src /src
#ADD ./Usage.md /
#ADD ./config.js /
#ADD ./tests /tests
#RUN cd /; npm install

#
# Install from npm also (select which version to run from supervisord.conf)
#

RUN mkdir /odataserver
RUN /bin/bash -c "cd /odataserver; npm install odataserver"
RUN /bin/bash -c "cd /odataserver; npm link odataserver"
ADD ./bin/start2.sh /


#
# Start things
# -----------

# RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Fix permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80 81 443 9000
CMD ["supervisord"]
