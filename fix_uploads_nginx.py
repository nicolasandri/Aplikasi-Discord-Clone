#!/usr/bin/env python3
import re

# Read the nginx config file
config_path = '/etc/nginx/sites-available/workgrid'
with open(config_path, 'r') as f:
    content = f.read()

# Replace the uploads location block
old_block = '''    # Uploads proxy (must be before static files regex, using ^~ to prevent regex matching)
    location ^~ /uploads {
        proxy_pass http://152.42.229.212:3001/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }'''

new_block = '''    # Uploads proxy with fallback to default avatar
    location ^~ /uploads {
        proxy_pass http://152.42.229.212:3001/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # If file not found on backend, serve default avatar
        proxy_intercept_errors on;
        error_page 404 = /default-avatar.svg;
    }'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(config_path, 'w') as f:
        f.write(content)
    print('✅ Nginx config updated successfully!')
else:
    print('❌ Could not find the uploads location block')
    print('Current content around uploads:')
    idx = content.find('location ^~ /uploads')
    if idx != -1:
        print(content[idx:idx+500])
    exit(1)
