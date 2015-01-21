#!/bin/bash
#
# Generate a self signed certificate
#

cat > csr.conf << EOF
SE
Gothenburg
Gothenburg
Example Inc.
Example Inc.
example.com
name at example dot com


EOF

# Everything in one line
openssl req -nodes -new -x509 -keyout server.key -out server.cer < csr.conf
