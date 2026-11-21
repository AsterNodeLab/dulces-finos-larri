# Inicia VisionQuant Studio en modo desarrollo (http://localhost:3000)
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
if (-not (Test-Path node_modules)) { Write-Host "Primero ejecuta scripts\windows\setup.ps1" -ForegroundColor Red; exit 1 }
Start-Process "http://localhost:3000"
npm run dev
