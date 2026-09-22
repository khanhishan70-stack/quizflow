$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cf   = Join-Path $root 'tools\cloudflared.exe'
$log  = Join-Path $env:TEMP 'quizflow_tunnel.log'

Write-Host '== QuizFlow Battle Launcher ==' -ForegroundColor Cyan
Write-Host ('Project: ' + $root) -ForegroundColor Gray

Get-Process node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host '1) Starting battle server on port 9090...' -ForegroundColor Yellow
Start-Process -FilePath 'node.exe' -ArgumentList 'server/battle-server.js' -WorkingDirectory $root -WindowStyle Hidden
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if ((Test-NetConnection -ComputerName 127.0.0.1 -Port 9090 -WarningAction SilentlyContinue).TcpTestSucceeded) { $ready = $true; break }
}
if ($ready) { Write-Host '   Battle server: RUNNING' -ForegroundColor Green } else { Write-Host '   Battle server: FAILED to start' -ForegroundColor Red }

Write-Host '2) Connecting public tunnel...' -ForegroundColor Yellow
Remove-Item $log -ErrorAction SilentlyContinue
$bat = Join-Path $env:TEMP 'quizflow_tunnel.bat'
Set-Content -Path $bat -Value '@echo off', ('cd /d "' + $root + '"'), ('set "LOG=' + $log + '"'), 'del "%LOG%" >nul 2>&1', ('tools\cloudflared.exe tunnel --url http://localhost:9090 --no-autoupdate >> "%LOG%" 2>&1') -Encoding ASCII
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $bat -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value; break }
}
if (-not $url) { Write-Host '   Tunnel: FAILED - no public URL' -ForegroundColor Red; exit 1 }
$wss = 'wss://' + ($url -replace '^https://','')
$log = Join-Path $env:TEMP 'quizflow_tunnel.log'
Write-Host ("   Tunnel URL:  " + $url) -ForegroundColor Green
Write-Host ("   WS URL:      " + $wss) -ForegroundColor Green

Write-Host '3) Updating config.js with new tunnel URL...' -ForegroundColor Yellow
$cfg = Join-Path $root 'assets\js\config.js'
$content = Get-Content $cfg -Raw
$content = $content -replace 'wss://[a-z0-9-]+\.trycloudflare\.com', $wss
Set-Content -Path $cfg -Value $content -NoNewline -Encoding UTF8

Write-Host '4) Publishing to GitHub Pages (updates live site)...' -ForegroundColor Yellow
Push-Location $root
git add assets/js/config.js | Out-Null
git commit -m 'battle url update' 2>$null | Out-Null
git push 2>&1 | ForEach-Object { Write-Host ('   ' + $_) -ForegroundColor Gray }
Pop-Location

Write-Host ''
Write-Host 'BATTLE MODE IS LIVE!' -ForegroundColor Green
Write-Host "Connect from anywhere to: $wss" -ForegroundColor Green
Write-Host ''
Write-Host 'Keep this window open to run battles. Close it to stop.' -ForegroundColor Yellow
if ($env:QUIZFLOW_TEST -eq '1') { exit 0 }
Read-Host 'Press ENTER to stop everything and close'
Get-Process node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force