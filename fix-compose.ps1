#!/usr/bin/env pwsh
$privateKeyPath = "$env:USERPROFILE\.ssh\workgrid_new_key"
$server = "root@152.42.229.212"

# Fix the docker-compose.yml file by adding quotes around the password
$commands = @'
cd /opt/workgrid
cp docker-compose.yml docker-compose.yml.bak
sed -i "s/DB_PASSWORD: WorkGridDB@Secure2024!/DB_PASSWORD: 'WorkGridDB@Secure2024!'/' docker-compose.yml
grep -n DB_PASSWORD docker-compose.yml
'@

# Encode and send
$bytes = [System.Text.Encoding]::UTF8.GetBytes($commands)
$encoded = [Convert]::ToBase64String($bytes)

ssh -o StrictHostKeyChecking=no -i $privateKeyPath $server "echo $encoded | base64 -d | bash"
