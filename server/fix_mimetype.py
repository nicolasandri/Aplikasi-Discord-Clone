with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Fix type to mimetype
content = content.replace('"type": "image/gif"', '"mimetype": "image/gif"')

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.write(content)

print('Fixed!')
