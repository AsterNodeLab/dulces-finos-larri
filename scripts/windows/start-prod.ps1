# Compila y arranca en modo produccion (mas ligero en RAM que dev). http://localhost:3000
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
npm run build; if ($LASTEXITCODE -ne 0) { exit 1 }
Start-Process "http://localhost:3000"
npm run start
