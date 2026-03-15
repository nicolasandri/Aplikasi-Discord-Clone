with open('/opt/workgrid/server/server.js', 'r') as f:
    lines = f.readlines()

# Find line 836 (index 835) and fix it
for i in range(len(lines)):
    if 'Selamat datang **!' in lines[i] and 'Semua member' in lines[i]:
        # Replace with proper template literal
        lines[i] = '                `Selamat datang **${user.display_name || user.username}!** 👋 Semua member sekarang bisa berteman denganmu.`,\n'
        print(f'Fixed line {i+1}')
        break

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.writelines(lines)

print('Done!')
