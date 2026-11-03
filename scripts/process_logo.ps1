Add-Type -AssemblyName System.Drawing

$srcPath = "$PWD/public/branding/applywise-logo.jpg"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# 1. Generate applywise-logo.png (Full squircle badge with outer black made transparent)
# We can use LockBits for high-speed pixel manipulation
$outBadge = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Using GetPixel/SetPixel or LockBits. Let's do LockBits for speed and precision.
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$srcData = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $outBadge.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $w * $h * 4
$srcBuffer = New-Object byte[] $bytes
$dstBuffer = New-Object byte[] $bytes

[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)

# Find squircle center (512, 512). Pixels outside the squircle glow are pure black (R < 15, G < 15, B < 15).
# For outer glow transition, alpha can be smoothly computed from brightness:
# If brightness < 10, alpha = 0.
# If between 10 and 80, smooth alpha ramp.
# Above 80, alpha = 255.
for ($i = 0; $i -lt $bytes; $i += 4) {
    $b = $srcBuffer[$i]
    $g = $srcBuffer[$i+1]
    $r = $srcBuffer[$i+2]
    
    $brightness = [Math]::Max($r, [Math]::Max($g, $b))
    
    if ($brightness -le 8) {
        $dstBuffer[$i] = 0
        $dstBuffer[$i+1] = 0
        $dstBuffer[$i+2] = 0
        $dstBuffer[$i+3] = 0
    } elseif ($brightness -lt 70) {
        $alpha = [int](($brightness - 8) / 62.0 * 255.0)
        # unmultiply black so glow looks natural on light or dark backgrounds
        $scale = 255.0 / [Math]::Max(1.0, [double]$brightness)
        $dstBuffer[$i] = [byte][Math]::Min(255, [int]($b * $scale))
        $dstBuffer[$i+1] = [byte][Math]::Min(255, [int]($g * $scale))
        $dstBuffer[$i+2] = [byte][Math]::Min(255, [int]($r * $scale))
        $dstBuffer[$i+3] = [byte]$alpha
    } else {
        $dstBuffer[$i] = $b
        $dstBuffer[$i+1] = $g
        $dstBuffer[$i+2] = $r
        $dstBuffer[$i+3] = 255
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($dstBuffer, 0, $dstData.Scan0, $bytes)
$src.UnlockBits($srcData)
$outBadge.UnlockBits($dstData)

$outBadge.Save("$PWD/public/branding/applyvise-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$outBadge.Save("$PWD/public/branding/applywise-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved public/branding/applyvise-logo.png and applywise-logo.png"

# 2. Generate resized favicons & app icons
$sizes = @(16, 32, 64, 180, 192, 512)
foreach ($sz in $sizes) {
    $resized = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($outBadge, 0, 0, $sz, $sz)
    $g.Dispose()

    if ($sz -eq 32) {
        $resized.Save("$PWD/public/favicon-32x32.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $resized.Save("$PWD/public/favicon.ico", [System.Drawing.Imaging.ImageFormat]::Icon)
    }
    if ($sz -eq 16) {
        $resized.Save("$PWD/public/favicon-16x16.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
    if ($sz -eq 180) {
        $resized.Save("$PWD/public/apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
    if ($sz -eq 192) {
        $resized.Save("$PWD/public/branding/icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
    if ($sz -eq 512) {
        $resized.Save("$PWD/public/branding/icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $resized.Dispose()
}

Write-Output "Saved all icon variants"

$outBadge.Dispose()
$src.Dispose()
