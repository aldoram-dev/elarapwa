Param()

Add-Type -AssemblyName System.Drawing

function New-AppIcon {
    param(
        [int]$Size,
        [string]$Path,
        [switch]$Maskable
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'ClearTypeGridFit'

    # Font size roughly half the canvas, adjust for readability.
    $fontSize = [int]($Size * 0.5)
    if ($Size -eq 64) { $fontSize = [int]($Size * 0.48) }
    $font = New-Object System.Drawing.Font 'Arial', $fontSize, ([System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0x9c,0x27,0xb0))

    $text = 'App'
    $textSize = $g.MeasureString($text, $font)
    $x = ($Size - $textSize.Width) / 2
    $y = ($Size - $textSize.Height) / 2
    $g.DrawString($text, $font, $brush, $x, $y)

    $g.Dispose()

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $projectRoot 'public' | Join-Path -ChildPath 'icons'
if (-not (Test-Path $outDir)) { Write-Error "Directorio no encontrado: $outDir"; exit 1 }

Write-Host "Generando iconos en $outDir"

New-AppIcon -Size 192 -Path (Join-Path $outDir 'logo-192.png')
New-AppIcon -Size 512 -Path (Join-Path $outDir 'logo-512.png')
New-AppIcon -Size 512 -Path (Join-Path $outDir 'maskable-512.png') -Maskable
New-AppIcon -Size 64  -Path (Join-Path $outDir 'faviconobj.png')

Write-Host "Listo. Archivos generados:" (Get-ChildItem $outDir -Filter *logo* | Select-Object Name) (Get-ChildItem $outDir -Filter faviconobj.png | Select-Object Name)