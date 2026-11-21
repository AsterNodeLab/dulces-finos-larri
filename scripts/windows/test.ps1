# Ejecuta verificaciones: tipos, lint, pruebas unitarias y build.
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$steps = @("typecheck", "lint", "test", "build")
foreach ($s in $steps) {
  Write-Host "`n== npm run $s ==" -ForegroundColor Cyan
  npm run $s
  if ($LASTEXITCODE -ne 0) { Write-Host "Fallo: $s" -ForegroundColor Red; exit 1 }
}
Write-Host "`nTodo OK" -ForegroundColor Green
