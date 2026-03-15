#!/bin/bash
LINE=$(sed -n '1361p' /opt/workgrid/server/database-postgres.js)
NEWLINE=$(echo "$LINE" | sed 's/|| ::text/|| \$1::text/')
sed -i "1361s/.*/$NEWLINE/" /opt/workgrid/server/database-postgres.js
echo "Fixed line 1361"
sed -n '1361p' /opt/workgrid/server/database-postgres.js
