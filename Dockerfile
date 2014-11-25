# OData producer on top of MySQL and Apache
#
# VERSION               0.0.1

FROM       ubuntu:14.10

# Format: MAINTAINER Name <email@addr.ess>
MAINTAINER Jonas Colmsjö <jonas@gizur.com>

RUN echo "export HOME=/root" >> /root/.profile

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
# Install Apache
# ---------------

RUN apt-get install -y apache2 php5 php5-curl php5-mysql php5-mcrypt
RUN a2enmod rewrite status
ADD ./src-docker/etc-apache2-apache2.conf /etc/apache2/apache2.conf
ADD ./src-docker/etc-apache2-ports.conf /etc/apache2/ports.conf
ADD ./src-docker/etc-apache2-mods-available-status.conf /etc/apache2/mods-available/status.conf

RUN rm /var/www/html/index.html
RUN echo "<?php\nphpinfo();\n " > /var/www/html/info.php

# Install phpMyAdmin
ADD ./src-phpmyadmin/phpMyAdmin-4.0.8-all-languages.tar.gz /var/www/html/
ADD ./src-phpmyadmin/config.inc.php /var/www/html/phpMyAdmin-4.0.8-all-languages/config.inc.php


#
# Install NodeJS
# --------------

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.13.1/install.sh | bash
# RUN echo "[ -s $HOME/.nvm/nvm.sh ] && . $HOME/.nvm/nvm.sh" >> $HOME/.profile
RUN /bin/bash -c "source $HOME/.profile && nvm install v0.10.33"

ADD ./src-docker/init-node.sh /src/
RUN /src/init-node.sh


#
# Install MySQL
# -------------

# init script and test db
ADD ./src-docker/init-mysql.sh /src/
ADD ./src-sql/test-wp.sql /src/
ADD ./src-sql/test-vtiger.sql /src/

# Install MySQL server
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Fix configuration
RUN sed -i -e"s/^bind-address\s*=\s*127.0.0.1/bind-address = 0.0.0.0/" /etc/mysql/my.cnf

# Setup admin user
RUN /src/init-mysql.sh


#
# Add source for the odatamysql server
# ------------------------------------

ADD ./package.json /src/
ADD ./src /src
RUN cd /src; npm install
ADD ./src-docker/start-node.sh /

# Add batches here since it changes often (use cache when building)
ADD ./src-docker/batches.py /
ADD ./src-docker/batches.sh /


#
# Start things
# -----------

# RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Fix permissions
RUN chown -R www-data:www-data /var/www/html

RUN mkdir /volume
VOLUME /volume

EXPOSE 80 81 443 3306

ADD ./start.sh /
CMD ["/start.sh"]
