#!/bin/bash
sed -i "s/VALUES (, , , , NOW())/VALUES (\\\$1, \\$2, \\$3, \\$4, NOW())/g" /opt/workgrid/server/server.js
