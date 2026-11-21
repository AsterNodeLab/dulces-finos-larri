# Limpia temporales de render (data/tmp). No borra proyectos ni videos.
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
npm run clean:tmp
