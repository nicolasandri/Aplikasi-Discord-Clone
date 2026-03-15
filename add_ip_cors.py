#!/usr/bin/env python3

# Baca file
with open("/opt/workgrid/server/server.js", "r") as f:
    content = f.read()

# Cari posisi setelah https://workgrid.homeku.net push
marker = """if (!ALLOWED_ORIGINS.includes('https://workgrid.homeku.net')) {
  ALLOWED_ORIGINS.push('https://workgrid.homeku.net');
}

const { db,"""

replacement = """if (!ALLOWED_ORIGINS.includes('https://workgrid.homeku.net')) {
  ALLOWED_ORIGINS.push('https://workgrid.homeku.net');
}

// Allow IP address access
if (!ALLOWED_ORIGINS.includes('http://152.42.242.180')) {
  ALLOWED_ORIGINS.push('http://152.42.242.180');
}

const { db,"""

new_content = content.replace(marker, replacement)

# Tulis kembali
with open("/opt/workgrid/server/server.js", "w") as f:
    f.write(new_content)

print("IP address added to CORS!")
