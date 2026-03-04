# Create icon from PNG using .NET
Add-Type -AssemblyName System.Drawing

$pngPath = "..\app\public\workgrid_app_icon.png"
$icoPath = "..\app\public\icon.ico"

# Load PNG
$bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)

# Create icon (16x16, 32x32, 48x48, 256x256)
$stream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($stream)

# ICO Header
$writer.Write([byte]0)       # Reserved
$writer.Write([byte]0)
$writer.Write([byte]1)       # Type (1 = icon)
$writer.Write([byte]0)
$writer.Write([byte]4)       # Count (4 images)
$writer.Write([byte]0)

# Image entries and data
$sizes = @(16, 32, 48, 256)
$offset = 6 + (16 * 4)  # Header + 4 entries

# Calculate offsets first
$imageData = @()
foreach ($size in $sizes) {
    $newBitmap = New-Object System.Drawing.Bitmap $bitmap, $size, $size
    $memStream = New-Object System.IO.MemoryStream
    $newBitmap.Save($memStream, [System.Drawing.Imaging.ImageFormat]::Png)
    $data = $memStream.ToArray()
    $imageData += ,$data
    $newBitmap.Dispose()
    $memStream.Close()
}

# Write entries
for ($i = 0; $i -lt 4; $i++) {
    $size = $sizes[$i]
    $width = if ($size -eq 256) { 0 } else { $size }
    $height = if ($size -eq 256) { 0 } else { $size }
    
    $writer.Write([byte]$width)   # Width
    $writer.Write([byte]$height)  # Height
    $writer.Write([byte]0)        # Colors (0 = >256)
    $writer.Write([byte]0)        # Reserved
    $writer.Write([byte]1)        # Color planes
    $writer.Write([byte]0)
    $writer.Write([byte]32)       # Bits per pixel
    $writer.Write([byte]0)
    $writer.Write([int]$imageData[$i].Length)  # Size
    $writer.Write([int]$offset)                 # Offset
    
    $offset += $imageData[$i].Length
}

# Write image data
foreach ($data in $imageData) {
    $writer.Write($data)
}

$writer.Close()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$stream.Close()
$bitmap.Dispose()

Write-Host "Icon created successfully at: $icoPath"
