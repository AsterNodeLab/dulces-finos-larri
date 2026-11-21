# Renderiza el proyecto demo a MP4 sin abrir la app (prueba de punta a punta).
# Uso: scripts\windows\render-demo.ps1            (final 1080x1920)
#      scripts\windows\render-demo.ps1 -Preview   (540x960, rapido)
param([switch]$Preview)
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
if ($Preview) { npm run render:demo -- --preview } else { npm run render:demo }
