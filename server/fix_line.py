with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    lines = f.readlines()

# Use string with proper escaping
lines[985] = "       VALUES ($1, $2, $3, $4, $5, $6, $7)`,\n"

with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
    f.writelines(lines)

print('Fixed line 986')
