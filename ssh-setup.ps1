$password = '%0|F?H@f!berhO3e'
$server = '143.198.217.81'
$publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHCZ/cjl0D3uTS/aguoFJn9N8Saa5R6ZR9H/wp0MlXJc workgrid-sgp-access'

# Use plink if available
$plinkPath = 'C:\Program Files\PuTTY\plink.exe'
if (Test-Path $plinkPath) {
    $cmd = "echo y | `"$plinkPath`" -ssh -l root -pw `"$password`" $server `"mkdir -p /root/.ssh; echo '$publicKey' > /root/.ssh/authorized_keys; chmod 600 /root/.ssh/authorized_keys; chmod 700 /root/.ssh`""
    Invoke-Expression $cmd
} else {
    Write-Host 'PuTTY not found. Please install PuTTY or manually add SSH key.'
}
