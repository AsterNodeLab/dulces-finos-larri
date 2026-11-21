# Instalación en Windows (laptop Ryzen 5 3500U · 12 GB · Vega 8)

Probado como objetivo de diseño; **la ejecución real en tu laptop aún no se ha verificado** (ver `docs/QA_REPORT.md`).

## 1. Requisitos

| Herramienta | Versión | Instalación |
|---|---|---|
| Node.js | **22.13+** (recomendado 24 LTS) | `winget install OpenJS.NodeJS.LTS` |
| Git | cualquiera reciente | `winget install Git.Git` |
| OpenCode (opcional) | última | ver `docs/OPENCODE_SETUP.md` |

No necesitas instalar FFmpeg: Remotion trae `ffmpeg.exe`/`ffprobe.exe` en `@remotion/compositor-win32-x64-msvc`. Tampoco GPU NVIDIA ni CUDA.

## 2. Clonar e instalar

```powershell
git clone https://github.com/AsterNodeLab/dulces-finos-larri.git visionquant-studio
cd visionquant-studio
git checkout claude/peaceful-cannon-69dybm   # rama con el MVP (o main cuando se fusione)
powershell -ExecutionPolicy Bypass -File scripts\windows\setup.ps1
```

`setup.ps1`:
1. Verifica Node ≥ 22.13 (mensaje claro si falta).
2. `npm ci`.
3. Crea `.env.local` desde `.env.example` (sin claves = modo demo).
4. Migra SQLite y crea el **proyecto demo**.
5. Descarga Chrome Headless Shell para Remotion (`npx remotion browser ensure`, ~100 MB, una sola vez).
6. Ejecuta `npm run doctor`.

## 3. Usar

```powershell
scripts\windows\start.ps1          # desarrollo: abre http://localhost:3000
scripts\windows\start-prod.ps1     # producción: compila y arranca (usa menos RAM que dev)
scripts\windows\render-demo.ps1 -Preview   # prueba de render sin la UI
scripts\windows\test.ps1           # typecheck + lint + tests + build
scripts\windows\clean.ps1          # borra temporales de render
```

## 4. Ajustes para equipo modesto (`.env.local`)

```ini
RENDER_CONCURRENCY=2        # hilos de Chrome renderizando frames. 3 si el equipo va holgado; 1 si te quedas sin RAM
RENDER_PREVIEW_SCALE=0.5    # previsualización a 540x960 (≈4x más rápida)
RENDER_X264_PRESET=medium   # "fast" acelera el render final con archivos algo más grandes
```

Recomendaciones:
- Usa **Previsualización rápida** mientras editas; deja el **Render final** para el cierre.
- Cierra pestañas pesadas del navegador durante el render final (Chrome headless + x264 usan CPU al 100 %).
- Para menos RAM, corre en producción (`start-prod.ps1`) en lugar de `npm run dev`.
- Los renders son secuenciales: si lanzas varios, se encolan.
- Estimación (no medida en tu equipo): 45 s de video final ≈ 4–8 min en un 3500U con concurrencia 2. En la nube (4 vCPU) tardó ~2 min.

## 5. Voz

- **Importar MP3/WAV/M4A** (tu voz o la que generes en ElevenLabs/otro): siempre funciona.
- **ElevenLabs API**: agrega `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID`.
- **Voz sintética demo** (espeak-ng) normalmente no está en Windows; el proyecto demo ya trae su narración en `assets/demo/`.

## 6. Problemas comunes

| Síntoma | Solución |
|---|---|
| `node:sqlite` no encontrado | Actualiza Node a 22.13+ |
| El render falla al descargar el navegador | Ejecuta `npx remotion browser ensure` con internet; o define `REMOTION_BROWSER_EXECUTABLE` apuntando a un Chrome/Chromium existente |
| `ExecutionPolicy` bloquea los .ps1 | `powershell -ExecutionPolicy Bypass -File scripts\windows\setup.ps1` |
| Render muy lento / se congela | `RENDER_CONCURRENCY=1`, cierra apps, usa previsualización |
| Puerto 3000 ocupado | `npx next dev --port 3001` |
| Trabajo "interrumpido" tras cerrar la app | Usa **Reintentar** en la pestaña Render |
