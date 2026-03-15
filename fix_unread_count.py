#!/usr/bin/env python3
import re

with open("/opt/workgrid/server/database-postgres.js", "r") as f:
    content = f.read()

# Replace the problematic LIKE pattern with POSITION
old_pattern = "m.content LIKE '%<@' || $1 || '>%'"
new_pattern = "POSITION('<@' || $1::text || '>' IN m.content) > 0"

content = content.replace(old_pattern, new_pattern)

with open("/opt/workgrid/server/database-postgres.js", "w") as f:
    f.write(content)

print("Fixed!")
