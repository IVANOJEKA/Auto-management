$fp = "src\app\page.tsx"
$bytes = [System.IO.File]::ReadAllBytes($fp)

# Strip BOM (EF BB BF) if present
$start = 0
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $start = 3
    Write-Host "BOM detected and stripped"
}

# Decode the current file (which was wrongly double-encoded) as UTF-8
$content = [System.Text.Encoding]::UTF8.GetString($bytes, $start, $bytes.Length - $start)

# Re-encode as Latin-1 (ISO-8859-1) to recover the original raw UTF-8 bytes
$originalBytes = [System.Text.Encoding]::GetEncoding(28591).GetBytes($content)

# Write back as raw bytes (pure UTF-8, no BOM)
[System.IO.File]::WriteAllBytes($fp, $originalBytes)

Write-Host "Fixed: was $($bytes.Length) bytes -> now $($originalBytes.Length) bytes"
