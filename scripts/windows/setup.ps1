# VisionQuant Studio — configuración inicial en Windows (PowerShell 5+ / 7)
# Uso: clic derecho > "Ejecutar con PowerShell", o en una terminal:
#   powershell -ExecutionPolicy Bypass -File scripts\windows\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

function Fail($msg) { Write-Host "`n[X] $msg" -ForegroundColor Red; exit 1 }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Info($msg) { Write-Host "[..] $msg" -ForegroundColor Cyan }

Write-Host "`nVisionQuant Studio - setup`n" -ForegroundColor Yellow

# 1) Node.js >= 22.13 (node:sqlite)
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail "Node.js no esta instalado. Instala Node 22 o 24 LTS: winget install OpenJS.NodeJS.LTS  (o https://nodejs.org) y vuelve a abrir la terminal." }
$v = (node -v).TrimStart("v").Split(".")
if ([int]$v[0] -lt 22 -or ([int]$v[0] -eq 22 -and [int]$v[1] -lt 13)) { Fail "Node $(node -v) es antiguo. Se requiere >= 22.13 (node:sqlite). Actualiza a Node 22/24 LTS." }
Ok "Node $(node -v)"

# 2) Git (opcional pero recomendado)
if (Get-Command git -ErrorAction SilentlyContinue) { Ok "git $(git --version)" } else { Write-Host "[!] git no encontrado (opcional): winget install Git.Git" -ForegroundColor Yellow }

# 3) Dependencias
Info "Instalando dependencias (npm ci)... puede tardar varios minutos."
if (Test-Path package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { Fail "npm fallo. Revisa tu conexion o borra node_modules y reintenta." }
Ok "Dependencias instaladas"

# 4) .env.local
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local; Ok "Creado .env.local (edita tus claves si las tienes; sin claves funciona en modo demo)" } else { Ok ".env.local ya existe" }

# 5) Base de datos + proyecto demo
npm run db:migrate; if ($LASTEXITCODE -ne 0) { Fail "Migracion fallida" }
npm run db:seed-demo; if ($LASTEXITCODE -ne 0) { Fail "No se pudo crear el proyecto demo" }

# 6) Navegador de render de Remotion (descarga Chrome Headless Shell una vez, ~100 MB)
Info "Preparando navegador de render de Remotion..."
npx remotion browser ensure
if ($LASTEXITCODE -ne 0) { Write-Host "[!] No se pudo descargar el navegador ahora; Remotion lo intentara en el primer render." -ForegroundColor Yellow } else { Ok "Navegador de render listo" }

# 7) Diagnostico
npm run doctor

Write-Host "`nListo. Inicia la app con:  scripts\windows\start.ps1   (o: npm run dev) y abre http://localhost:3000`n" -ForegroundColor Green
