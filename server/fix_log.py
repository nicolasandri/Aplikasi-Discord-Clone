with open('/opt/workgrid/server/server.js', 'r') as f:
    lines = f.readlines()

# Fix line 853 (index 852)
for i in range(len(lines)):
    if '[Register] Welcome message sent for' in lines[i] and '${username}' not in lines[i]:
        lines[i] = '              console.log(`[Register] Welcome message sent for ${username}`);\n'
        print(f'Fixed line {i+1}')
        break

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.writelines(lines)

print('Done!')
