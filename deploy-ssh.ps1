$password = "%0|F?H@f!berhO3e"
$sshCommand = "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 root@152.42.229.212"

# Create a process start info
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh"
$psi.Arguments = "-o StrictHostKeyChecking=no -o ConnectTimeout=30 root@152.42.229.212 echo SSH_OK"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false

# Start the process
$process = [System.Diagnostics.Process]::Start($psi)

# Wait for password prompt
Start-Sleep -Seconds 2
$output = $process.StandardOutput.ReadToEnd()
$error = $process.StandardError.ReadToEnd()
Write-Host "Output: $output"
Write-Host "Error: $error"

# Send password
$process.StandardInput.WriteLine($password)

# Wait for response
Start-Sleep -Seconds 3
$output = $process.StandardOutput.ReadToEnd()
Write-Host "Final Output: $output"

$process.WaitForExit()
Write-Host "Exit Code: $($process.ExitCode)"
