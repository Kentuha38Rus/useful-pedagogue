#!/bin/sh
set -e

# Make cert files readable for nginx (container uid 101)
chmod -R a+rX /etc/letsencrypt/live /etc/letsencrypt/archive
find /etc/letsencrypt/archive -name "privkey*.pem" -exec chmod 644 {} \;

echo "[$(date -Iseconds)] deploy-hook: cert permissions fixed" >&2