# renders logo.png, a haloed starburst on claude orange
Add-Type -AssemblyName System.Drawing
$size = 1024
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#D97757'))

$ivory = [System.Drawing.Color]::FromArgb(255, 250, 249, 245)
$pen = New-Object System.Drawing.Pen($ivory, 64)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

# eight-rayed starburst, one ray pointing straight up at the halo
$cx = 512.0; $cy = 610.0; $r = 235.0
for ($i = 0; $i -lt 8; $i++) {
    $a = $i * 45 * [Math]::PI / 180
    $x2 = $cx + $r * [Math]::Sin($a)
    $y2 = $cy - $r * [Math]::Cos($a)
    $g.DrawLine($pen, [single]$cx, [single]$cy, [single]$x2, [single]$y2)
}

# tilted halo hovering above
$haloPen = New-Object System.Drawing.Pen($ivory, 46)
$g.TranslateTransform(512, 185)
$g.RotateTransform(-7)
$g.DrawEllipse($haloPen, -200, -52, 400, 104)
$g.ResetTransform()

$out = Join-Path $PSScriptRoot 'logo.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "saved $out"
