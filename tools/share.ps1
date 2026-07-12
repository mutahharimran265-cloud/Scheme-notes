# SchemNotes — start the app + a public Cloudflare tunnel, print a shareable
# link + QR code, and keep it alive. Send the link to anyone: they can open it
# on any device with no install and test before you deploy.
#
# Database: SQLite by default (zero config). If your .env points DATABASE_URL at
# Postgres (e.g. Neon), this runs the exact cloud stack instead and creates the
# tables in your database on first run.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# --- read a KEY=value .env into a hashtable (quotes stripped, # lines skipped)
function Read-DotEnv([string]$path) {
    $h = @{}
    if (Test-Path $path) {
        foreach ($line in Get-Content $path) {
            if ($line -match '^\s*#') { continue }
            if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
                $v = $matches[2]
                if ($v.Length -ge 2 -and (($v[0] -eq '"' -and $v[-1] -eq '"') -or ($v[0] -eq "'" -and $v[-1] -eq "'"))) {
                    $v = $v.Substring(1, $v.Length - 2)
                }
                $h[$matches[1]] = $v
            }
        }
    }
    return $h
}

Write-Host ""
Write-Host "  Starting SchemNotes preview..." -ForegroundColor Cyan

# --- 0) Ensure cloudflared.exe (download once if missing) ---
$cf = Join-Path $PSScriptRoot 'cloudflared.exe'
if (-not (Test-Path $cf)) {
    Write-Host "  Downloading cloudflared (one time, ~50 MB)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cf
}

# --- 1) Decide DB mode from .env / .env.local (Postgres URL => cloud stack) ---
$envVars = Read-DotEnv (Join-Path $root '.env.local')
$fromEnv = Read-DotEnv (Join-Path $root '.env')
foreach ($k in $fromEnv.Keys) { if (-not $envVars.ContainsKey($k)) { $envVars[$k] = $fromEnv[$k] } }
$dbUrl = $envVars['DATABASE_URL']
$isPg = ($dbUrl -and ($dbUrl -match 'postgres'))
$provider = if ($isPg) { 'postgresql' } else { 'sqlite' }
Write-Host "  Database mode: $provider" -ForegroundColor Cyan

try {
    # --- 2) Point Prisma at the right provider (+ create tables for cloud) ---
    node scripts/use-db-provider.mjs $provider | Out-Null
    cmd /c "npx prisma generate" | Out-Null
    if ($isPg) {
        Write-Host "  Creating / syncing tables in your Postgres (Neon)..." -ForegroundColor Cyan
        cmd /c "npx prisma db push --skip-generate"
    } elseif (-not (Test-Path (Join-Path $root 'prisma\dev.db'))) {
        cmd /c "npx prisma db push --skip-generate" | Out-Null
    }

    # --- 3) Start the public tunnel and capture its URL ---
    Write-Host "  Creating your public link (a few seconds)..." -ForegroundColor Cyan
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $cf
    $psi.Arguments = 'tunnel --url http://localhost:3000'
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardOutput = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $tunnel = [System.Diagnostics.Process]::Start($psi)

    $url = $null
    while (-not $tunnel.HasExited -and -not $url) {
        $line = $tunnel.StandardError.ReadLine()
        if ($line -and ($line -match 'https://[a-z0-9-]+\.trycloudflare\.com')) { $url = $matches[0] }
    }
    if (-not $url) {
        Write-Host "  Could not create a link. Check your internet and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"; exit 1
    }

    # --- 4) Start the app so magic-link + share links point at the tunnel ---
    $env:APP_ORIGIN = $url
    $env:NEXT_PUBLIC_APP_URL = $url
    Start-Process -WindowStyle Minimized cmd -ArgumentList '/c', `
        "title SchemNotes Server && set APP_ORIGIN=$url && set NEXT_PUBLIC_APP_URL=$url && npm run dev" | Out-Null

    # --- 5) Write a QR + link page and open it ---
    $enc = [uri]::EscapeDataString($url)
    $html = @"
<!DOCTYPE html><html><head><meta charset='utf-8'><title>Share SchemNotes</title>
<style>body{font-family:Segoe UI,system-ui,sans-serif;text-align:center;padding:36px;background:#0b1020;color:#e7ebf5}
h1{color:#818cf8;margin-bottom:4px} a{color:#a5b4fc;font-size:16px;word-break:break-all}
.card{max-width:440px;margin:0 auto;background:#121a2e;border:1px solid #26304a;border-radius:20px;padding:26px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
img{width:300px;height:300px;margin:14px 0;background:#fff;border-radius:12px;padding:8px}
.db{display:inline-block;margin-top:6px;font-size:12px;color:#8b98b8;border:1px solid #26304a;border-radius:999px;padding:3px 10px}</style></head>
<body><div class='card'>
<h1>SchemNotes is live</h1>
<div class='db'>database: $provider</div>
<p>Scan with a phone camera, or share the link:</p>
<img src='https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=$enc' alt='QR'>
<p><a href='$url'>$url</a></p>
<p style='color:#6b7794;font-size:13px'>Keep the black SchemNotes window open while people are testing.</p>
</div></body></html>
"@
    $linkPage = Join-Path $PSScriptRoot 'link.html'
    $html | Out-File -FilePath $linkPage -Encoding utf8
    Start-Process $linkPage

    Clear-Host
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host "     SchemNotes is LIVE - share this link:" -ForegroundColor White
    Write-Host ""
    Write-Host "     $url" -ForegroundColor Green
    Write-Host ""
    Write-Host "     Database: $provider   (a QR code also opened in your browser)" -ForegroundColor White
    Write-Host "     Keep THIS window open while people test. Close it to stop." -ForegroundColor White
    Write-Host "  ============================================================" -ForegroundColor Cyan

    # --- 6) Keep the tunnel alive until this window is closed ---
    $tunnel.WaitForExit()
}
finally {
    # Leave the repo on its committed SQLite default and stop the dev server.
    node scripts/use-db-provider.mjs sqlite | Out-Null
    cmd /c 'taskkill /FI "WINDOWTITLE eq SchemNotes Server*" /T /F' 2>$null | Out-Null
}
