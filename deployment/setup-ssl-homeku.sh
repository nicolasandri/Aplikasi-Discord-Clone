#!/bin/bash
# Setup SSL for homeku.net

DOMAIN=${1:-"homeku.net"}

echo "🔒 Setting up SSL for $DOMAIN"
ssh root@167.172.72.73 "bash /opt/workgrid/deployment/setup-ssl.sh $DOMAIN"
