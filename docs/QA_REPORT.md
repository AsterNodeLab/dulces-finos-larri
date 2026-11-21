# QA & Security Report — VisionQuant Studio

Auditor: Agente D (QA senior / red team). Fecha: 2026-11-21. Objetivo: servidor de producción `next start` en `http://localhost:3100` (modo offline, sin claves). No se modificó código fuente; no se ejecutó `next build` ni git.

Etiquetas: **VERIFICADO** = lo ejecuté y observé el resultado. **INFERIDO** = sale de leer el código, sin explotarlo.

## 1. Resumen ejecutivo

**Funciona de punta a punta (VERIFICADO):** crear proyecto → investigación (texto) → guion offline con `[Completa: …]` → la aprobación se bloquea (400) → PUT del guion limpio → aprobar → storyboard determinista → subir narración MP3 → preview-spec → `captions.srt` → render preview en el worker separado → polling → descarga → ffprobe correcto. El render final del DEMO (1080×1920, 30 fps, H.264 + AAC, 47,63 s frente a 47,63 s del spec) es correcto y visualmente sólido. La cancelación, el reintento y la recuperación tras `kill -9` del worker funcionan: el job pasa a `error` con un mensaje claro.

**Veredicto, sin cortesía:** el producto es funcional y está bien hecho para uso local de una sola persona en un equipo de confianza. **No está listo para exponerse en una red**, y hay dos agujeros reales:

1. La API **no tiene autenticación, acepta CSRF** y `next start` **escucha en 0.0.0.0**. Cualquier página web que visites, o cualquier equipo de tu LAN, puede crear proyectos, subir archivos y encolar renders.
2. La protección SSRF **se salta con IPv6 mapeado a IPv4** (`http://[::ffff:127.0.0.1]/`). Además falla en abierto cuando el DNS no resuelve y es vulnerable a DNS rebinding.

Además, **el lint falla** (1 error), así que `scripts/windows/test.ps1` termina en error en Windows.

## 2. Evidencia de pruebas

| # | Comando / acción | Resultado | Tipo |
|---|---|---|---|
| T1 | `npx tsc --noEmit` | exit 0, sin errores | VERIFICADO |
| T2 | `npx eslint .` | **exit 1**: 1 error (`tests/security.test.ts:17:86` no-require-imports), 5 warnings (`store.ts:53-54`, `alignment.ts:65,83`, `postcss.config.mjs:1`) | VERIFICADO |
| T3 | `npx vitest run` | 6 archivos, 19/19 tests OK | VERIFICADO |
| T4 | POST research con URLs `127.0.0.1`, `localhost`, `169.254.169.254`, `file:///etc/passwd`, `0x7f000001`, `127.1`, `2130706433`, `[::1]`, `0.0.0.0`, `LOCALHOST.` | Todas sin extracto. Con `assertSafeUrl` directo: bloqueadas como "red privada" o "solo http(s)" | VERIFICADO |
| T5 | `assertSafeUrl` (tsx) con `http://[::ffff:127.0.0.1]:8999/`, `[::ffff:7f00:1]`, `[::127.0.0.1]`, `[64:ff9b::7f00:1]`, `[::ffff:a9fe:a9fe]` (=169.254.169.254) | **PASAN la validación**. fetch solo falló con EAFNOSUPPORT porque este sandbox no tiene IPv6 | VERIFICADO |
| T6 | `localtest.me`, `127.0.0.1.nip.io`, redirect de httpbin a 127.0.0.1 | No hay DNS externo en el sandbox (ENOTFOUND, "fetch failed"). Según el código, si DNS falla la URL **pasa** (`url.ts:35-36`) | VERIFICADO (parcial) / INFERIDO |
| T7 | `/api/media/` con `..%2f`, `%2e%2e/`, `%2e%2e%2f`, `..%5c`, `%2fetc%2fpasswd`, `%252e%252e`, `%00`, `C:%5c…` | Todas 404. `//etc/passwd` → 308 (normalización de Next, inocuo). Con `path.win32` también se contienen | VERIFICADO |
| T8 | `/api/media/<mp3>` con `Range: bytes=999999999-` y `bytes=500-100` | **500** (debería ser 416) | VERIFICADO |
| T9 | `/api/render-jobs/<traversal>/download` | 404. Usa `path.basename` del valor de la BD: seguro | VERIFICADO |
| T10 | Asset SVG / SVG renombrado a .png / texto renombrado a .png | 400 / 400 / 400 | VERIFICADO |
| T11 | Asset políglota (firma PNG + `<script>`) | **Aceptado (201)**. Se sirve como `image/png` con `nosniff` → riesgo bajo | VERIFICADO |
| T12 | Narración `notaudio`.mp3 / SVG | 400 / 400 | VERIFICADO |
| T13 | Narración "ID3"+basura | **500** con `detail` que filtra la ruta absoluta y la salida de ffprobe | VERIFICADO |
| T14 | Narración de 70 MB con Content-Length / chunked; asset de 70 MB | Las tres rechazadas (413/400). Pero en chunked y en assets el cuerpo **se bufferiza entero antes**: el RSS del servidor subió de 146 MB a **504 MB de pico** | VERIFICADO |
| T15 | grep de `.next/static` buscando `ANTHROPIC`, `xi-api-key`, `sk-` | Solo nombres de variables en textos de ayuda; ningún valor. No hay `NEXT_PUBLIC_*`. `.gitignore` cubre `.env.local` y `data/*` | VERIFICADO |
| T16 | Puerto 3100 en `/proc/net/tcp` | Escucha en `00000000:0C1C` = **0.0.0.0:3100** | VERIFICADO |
| T17 | POST cross-origin `Origin: http://evil.example`, `content-type: text/plain` a `/api/projects` | **201 Created**: CSRF aceptado | VERIFICADO |
| T18 | grep de `spawn/exec`: `backend.ts:52` (`process.execPath`, args fijos), `media-tools.ts:49` (execFile), `narration/service.ts:152` (espeak con argv) | Sin `shell:true`. El texto del usuario va como argv | VERIFICADO (lectura) |
| T19 | Salida del modelo: `ai/provider.ts:136` `JSON.parse` + Zod; `storyboard/service.ts:120` `SceneSchema.safeParse` | No hay eval/Function. `dangerouslySetInnerHTML` solo en `layout.tsx:19` con constante estática | INFERIDO |
| T20 | Flujo E2E completo (ver §1) | OK. Preview: 540×960, 30 fps, h264+aac 48 kHz estéreo, 47,70 s = spec 47,7 s | VERIFICADO |
| T21 | Render final DEMO `r_mwq4a66a0298dd60ef` | 1080×1920, 30/1, h264 `yuvj420p` (`color_range=pc`), aac 48 kHz 2 canales, 47,633 s = spec, 12,0 MB | VERIFICADO |
| T22 | `kill -9` del pid del worker (leído de `render_jobs.pid` con node:sqlite en solo lectura) durante el render | Job reaped a `error` con mensaje claro al llamar `GET /api/render-jobs`. No quedaron Chrome huérfanos. **Quedó `data/tmp/bundle-18996` (49 MB)** | VERIFICADO |
| T23 | retry → cancel durante el render | El nuevo job se crea; cancel → `cancelled` en ~6 s; el worker sale en idle | VERIFICADO |
| T24 | DELETE de proyectos de prueba | Borra `data/media/projects/<id>` y los MP4 (descarga → 404) | VERIFICADO |
| T25 | Playwright 1366×768: `/`, `/projects/<demo>`, `/settings` | 200, sin errores en la consola ni pageerror. Capturas correctas | VERIFICADO |

## 3. Hallazgos (por severidad)

| ID | Sev. | Área | Archivo:línea | Reproducción | Esperado vs. obtenido | Corrección |
|---|---|---|---|---|---|---|
| F1 | **Alta** | Exposición de red / auth | `package.json:13` (`next start --port 3000`), todas las rutas `src/app/api/**` | `next start` escucha en 0.0.0.0 (T16). La API no tiene autenticación | Esperado: solo loopback. Obtenido: cualquier equipo de la LAN o wifi pública puede usar la API: borrar proyectos, subir archivos, lanzar renders y gastar créditos de IA/ElevenLabs si hay claves | `next start -H 127.0.0.1` y `next dev -H 127.0.0.1` en scripts y `.ps1`. Opcional: token local en un header |
| F2 | **Alta** | CSRF | `src/lib/api.ts:24-31` (`readJson` no comprueba content-type ni Origin) | T17: `fetch("http://localhost:3000/api/projects",{method:"POST",body:'{...}'})` desde cualquier web (text/plain = petición simple, sin preflight) → 201. Los multipart (`/api/assets`, narración) también son "simples" | Esperado: 403 con Origin ajeno. Obtenido: se ejecuta. Una web maliciosa puede crear proyectos, subir assets o, con el id del demo (determinista vía `/api/demo`), encolar renders o llamadas de IA de pago | Middleware (`src/middleware.ts`) que rechace métodos no-GET cuando `Origin`/`Sec-Fetch-Site` no sea el propio host, y exija `content-type: application/json` en las rutas JSON. Validar `Host` contra DNS rebinding |
| F3 | **Alta** | SSRF | `src/lib/security/url.ts:15-17` | T5: `assertSafeUrl("http://[::ffff:127.0.0.1]/")` pasa. WHATWG normaliza a `[::ffff:7f00:1]` y `isPrivateIp` hace `slice(7)` → `"7f00:1"`, que no es IPv4. Igual con `[::ffff:a9fe:a9fe]` (metadata) y `[::127.0.0.1]`, `[64:ff9b::…]` | Esperado: bloqueo. Obtenido: validación superada. En un host dual-stack (Windows por defecto) conecta a 127.0.0.1 → lectura de la propia API, de servicios locales o de la metadata cloud | Usar `net.BlockList` (rangos v4 y v6, incluidos `::ffff:0:0/96`, `64:ff9b::/96`, `::/96`, `2002::/16`) o el paquete `ipaddr.js` con `.toIPv4Address()` antes de clasificar. Rechazar hosts IPv6 literales si no hacen falta |
| F4 | Media | SSRF (DNS) | `url.ts:35-36` y `49` | Si `dns.lookup` falla, la URL pasa (comentario explícito). fetch resuelve de nuevo → **DNS rebinding / TOCTOU**: un dominio que responde pública y luego 127.0.0.1 evade el filtro. INFERIDO (sin DNS externo aquí) | Esperado: fijar la IP validada. Obtenido: doble resolución | Undici `Agent` con `connect.lookup` que valide cada IP en la conexión. Si DNS no resuelve, fallar cerrado |
| F5 | Media | DoS / memoria | `src/app/api/assets/route.ts:31,44-45`; `narration/route.ts:20-25` | T14: el asset de 70 MB y la narración chunked se bufferizan enteros (`req.formData()`) antes de comprobar el tamaño. Pico de RSS 504 MB. Varios en paralelo en un equipo de 12 GB → OOM | Esperado: cortar al superar `MAX_UPLOAD_MB`. Obtenido: 413/400 después de cargar todo en RAM | Rechazar si falta `content-length` o es mayor que el límite en ambas rutas. Mejor: stream a disco con límite (busboy) |
| F6 | Media | Lint / CI Windows | `tests/security.test.ts:17` | `npx eslint .` → exit 1. `scripts/windows/test.ps1` corre lint y aborta | Esperado: verde. Obtenido: falla | Usar `import` en vez de `require()`. Arreglar los 5 warnings de `no-unused-expressions` (`a && b()` → `if`) |
| F7 | Media | Calidad de video | `scripts/render-worker.ts:79` (`pixelFormat:"yuv420p"` + `imageFormat:"jpeg"`) | T21: el MP4 sale `yuvj420p`, `color_range=pc` (rango completo), `color_space=bt470bg` | Esperado: yuv420p con rango limitado bt709 (estándar de redes sociales). Obtenido: rango completo; algunos reproductores o recodificadores (IG/TikTok) desplazan negros y contraste | `ffmpegOverride` o `colorSpace:"bt709"` de Remotion, y forzar `-color_range tv`. Verificar con ffprobe en el worker |
| F8 | Media | Fiabilidad Windows | `src/lib/render/backend.ts:22-29,33-37` | INFERIDO: `isAlive` con `process.kill(pid,0)`. En Windows los PID se reciclan rápido; si un PID muerto se reutiliza, el job queda "rendering" para siempre y `kick()` no arranca el worker. Además cualquier error (incluido EPERM) cuenta como "muerto" | Esperado: detectar el worker real. Obtenido: heurística por PID | Heartbeat en la BD (`updated_at` cada ≤5 s; reap si lleva más de 60 s sin cambios) en lugar de, o además de, el PID |
| F9 | Baja | Fuga de info | `src/lib/api.ts:45` | T13: el 500 devuelve `detail` con la ruta absoluta y el stderr de ffprobe | Esperado: 400 "audio inválido". Obtenido: 500 con internals | Envolver `probe()` en `importNarration` y lanzar `NarrationError`. No devolver `detail` en producción |
| F10 | Baja | HTTP Range | `media/[...path]/route.ts:25-29`; `render-jobs/[id]/download/route.ts:28-32` | T8: rango fuera de límites o invertido → 500. `bytes=-500` (sufijo) se interpreta como 0-500 | Esperado: 416 / sufijo correcto | Validar `start<=end<size`, devolver 416 y soportar rangos sufijo |
| F11 | Baja | Limpieza | `scripts/render-worker.ts:34` | T22: tras matar el worker queda `data/tmp/bundle-<pid>` (49 MB por cada caída) | Se acumula en disco | Al arrancar el worker, borrar `bundle-*` de pids no vivos. Ya existe `npm run clean:tmp`, pero es manual |
| F12 | Baja | Uploads | `assets/route.ts:12-22` | T11: un políglota PNG+HTML se acepta. Mitigado por `nosniff` y content-type fijo | Riesgo bajo | Opcional: decodificar o re-codificar con sharp o ffmpeg |
| F13 | Baja | Costes IA | `src/lib/ai/provider.ts:83`; narración ElevenLabs | OpenAI usa `ANTHROPIC_MAX_CALLS_PER_HOUR`. La generación ElevenLabs no tiene límite por hora (INFERIDO: no hay `assertWithinRate`). Con F1/F2 la superficie de gasto es remota | — | Límite propio por proveedor, incluido ElevenLabs, y un tope diario en USD |
| F14 | Baja | Contenido offline | `src/lib/research/service.ts:106-107` → guion offline | T20: el segmento 2 del esqueleto incluye literalmente "Resumen automático sin IA (revisar): 1 fuente(s)…". No lleva `[Completa:` en esa parte, así que si el usuario solo rellena los huecos, se narraría | Esperado: solo marcadores | Envolver el resumen en `[Completa: …]` o ponerlo en `visualHint`/nota |
| F15 | Baja | UX duración | flujo de narración | T20: guion con objetivo de 15 s, narración de 46,9 s → video de 47,7 s sin aviso | Aviso si la duración se desvía más de ±30 % | Advertencia en la UI y en la respuesta de la API |
| F16 | Info | Ruido | node:sqlite | `ExperimentalWarning: SQLite is an experimental feature` en cada proceso con Node 22 | — | `--disable-warning=ExperimentalWarning` en los scripts o recomendar Node 24 |

## 4. QA de video (render final DEMO `r_mwq4a66a0298dd60ef`)

ffprobe (T21): 1080×1920, 30 fps, 47,633 s (spec: 6 escenas, 1429 frames = 47,633 s; audio 46,84 s), H.264 + AAC 48 kHz estéreo. La duración cuadra exactamente.

Frames extraídos a 540 px de ancho en t = 1, 4, 8, 12, 17, 22, 27, 32, 37, 42 y 46 s. Los examiné visualmente:

| t (s) | Escena | Subtítulo en el frame | Palabras de `captions.words` en ±1 s | Observación |
|---|---|---|---|---|
| 1 | AnimatedHook | "Un chatbot responde preguntas." | "Un chatbot responde preguntas." | Sincronizado. El titular "Un agente no solo" va por delante de la voz (intencional, gancho) |
| 4 | AnimatedHook | "Un agente de inteligencia artificial hace algo más:" | "agente de inteligencia artificial" | OK |
| 8 | AnimatedHook | "decide qué pasos dar para cumplir un objetivo." | idem | OK |
| 12 | ConceptDiagram | "que usa herramientas en un ciclo." | "de lenguaje que usa herramientas" | OK. Las tarjetas aparecen progresivamente (01, 02) |
| 17 | ConceptDiagram | "tu correo o calendario y recuerda lo que hizo." | "herramientas como tu correo o calendario" | OK. 4 tarjetas, sin solaparse con el subtítulo |
| 22 | AnimatedWorkflow | "razona el siguiente paso, usa una herramienta," | "percibe la tarea, razona el siguiente" | El paso activo (2 Razonar) coincide con la voz |
| 27 | AnimatedWorkflow | "observa el resultado y repite hasta poder" | "resultado y repite hasta poder responder." | OK. "Se repite el ciclo" |
| 32 | AnimatedWorkflow (ejemplo) | "El agente revisa tu calendario, propone un" | "reunión. El agente revisa" | OK. Paso 2 Calendario activo |
| 37 | CrystalPresenter | "Tú decides si se envía." | "la respuesta. Tú decides si" | OK. Etiqueta "AVATAR PROVISIONAL" visible |
| 42 | BrandedOutro | "Un agente no reemplaza tu criterio: automatiza los" | "criterio: automatiza los pasos repetitivos." | OK |
| 46 | BrandedOutro | "Sígueme para aprender a construir tu primer" | "aprender a construir tu primer agente." | El CTA se duplica: botón y subtítulo con el mismo texto (redundante, aceptable) |

Zonas seguras (1080×1920; arriba 160, abajo 380, derecha 160):
- La caja de subtítulos acaba en y ≈ 1490 px, dentro del límite de 1540: **cumple**.
- El contenido de la derecha (tarjetas, "VISION ONE") llega a x ≈ 860–920, dentro del límite de 920: **cumple, justo**.
- La insignia superior "DEMO · voz sintética" y "VISION ONE" empiezan en y ≈ 150–170, **en el borde** de la zona de 160 px: pueden quedar bajo la UI de TikTok/Reels. Recomendación: bajarlas a y ≥ 180.
- Contraste: texto claro sobre azul muy oscuro, legible. Los pasos inactivos (gris al 20–30 %) son ilegibles a propósito, es el estado "pendiente".
- No vi solapamientos entre subtítulos y gráficos.
- El tercio inferior (por debajo de y ≈ 1500) queda vacío en todas las escenas. Es coherente con la zona segura, pero visualmente pesa.
- Consistencia: tipografía, paleta y cabecera son uniformes entre escenas.

El render preview del flujo E2E (540×960) también cuadró: 47,70 s = spec.

## 5. Portabilidad Windows y rendimiento (Ryzen 5 3500U / 12 GB)

| Riesgo | Detalle | Tipo |
|---|---|---|
| `test.ps1` falla | Por F6 (lint) | VERIFICADO (lint) |
| Bind 0.0.0.0 | Windows mostrará el aviso del Firewall al ejecutar `npm run start`/`dev`; si el usuario pulsa "Permitir", queda expuesto (F1). Añadir `-H 127.0.0.1` | INFERIDO |
| ffmpeg | `media-tools.ts` busca `FFMPEG_PATH` → PATH → `node_modules/@remotion/compositor-*/ffmpeg.exe`. `package-lock.json` incluye `compositor-win32-x64-msvc` (3 referencias), así que `npm ci` en Windows lo instala. Las DLL se cargan desde el directorio del exe (LD_LIBRARY_PATH es irrelevante en Windows, inocuo) | INFERIDO |
| Spawn del worker | `spawn(process.execPath, [tsx/dist/cli.mjs, script])` sin shell y con `windowsHide`. Correcto en Windows. Ojo: tsx crea un proceso hijo, así que `child.pid` (wrapper) ≠ `render_jobs.pid` (el worker escribe su `process.pid`). Matar el hijo terminó también el wrapper (T22) | VERIFICADO (Linux) |
| `process.kill(pid,0)` | Funciona en Windows, pero hay riesgo de reutilización de PID (F8) | INFERIDO |
| Rutas | `mediaAbs` con `path.win32`: probé `C:/…`, `..\..`, `\\server\share`, `D:x` y todos quedan contenidos (prefijo `startsWith(root)`). La comparación distingue mayúsculas, pero eso solo produce falsos negativos, no fugas | VERIFICADO (simulado con `path.win32`) |
| Rename | `renameSync(data/tmp/x.partial.mp4 → data/renders/x.mp4)`: mismo volumen salvo que `DATA_DIR` apunte a otra unidad. Con OneDrive o antivirus puede dar `EBUSY`/`EPERM`, sin reintento | INFERIDO |
| GL | `chromiumOptions.gl = "angle"` en win32. Razonable para la iGPU Vega 8. Si los drivers fallan, no hay fallback automático a `swangle` | INFERIDO |
| Voz demo | espeak-ng + MBROLA no existe en Windows → `demoTts:false`. El demo usa el MP3 versionado, así que no bloquea | INFERIDO |
| PowerShell | `setup.ps1` documenta `-ExecutionPolicy Bypass`, pero `start.ps1` y los demás no. La ejecución por clic puede bloquearse. Los comentarios con `—` y acentos en UTF-8 sin BOM se ven mal en PS 5.1 (solo comentarios, no rompe nada) | INFERIDO |
| Node | `engines >=22.13` y `setup.ps1` lo comprueba. Warning experimental (F16) | VERIFICADO |
| Memoria y CPU | Un render a la vez, `RENDER_CONCURRENCY=2`, preview a escala 0,5, cache offthread de 256 MB. Durante el preview, el worker usaba unos 325 MB de RSS más Chrome. Adecuado para 4c/8t y 12 GB. El render final (47 s) tardó unos 2 min 16 s aquí; en el 3500U espera 2-4 veces más. `x264Preset=medium` en el final: considerar `faster` en el portátil | VERIFICADO (sandbox) / INFERIDO (3500U) |

## 6. UI (Playwright, 1366×768)

Dashboard, workspace del demo (pestaña Render con Player) y Settings cargan con 200, sin errores de consola. Las capturas son correctas: Player 9:16 visible, checklist de render (6 escenas, narración 0:47, 114 palabras), insignia OFFLINE/DEMO. Observación: el contador "En producción: 8" incluye proyectos de pruebas E2E de otros agentes. No es un bug.

## 7. No verificado

- Ejecución real en Windows (setup.ps1, compositor win32, ANGLE, Firewall, PID reuse, OneDrive).
- Proveedores con claves reales: Anthropic (guion, storyboard, regenerate), OpenAI/Whisper, ElevenLabs (TTS y alineación exacta), incluidos rate limits y costes reales.
- OpenCode / `opencode.json`.
- Explotación completa de F3/F4 hasta una lectura real: el sandbox no tiene IPv6 ni DNS externo. La validación sí se saltó (T5).
- DNS rebinding contra la propia UI/API (relacionado con F2).
- `next build` (prohibido para no pisar `.next` del servidor en marcha).
- Radar RSS (`/api/radar`), métricas e importación CSV: no probados a fondo.

Limpieza: borré los proyectos de prueba (`QA SSRF throwaway`, `QA Flujo E2E`, `QA CSRF probe`) y el asset políglota. Quedó `data/tmp/bundle-18996` como evidencia de F11 (se elimina con `npm run clean:tmp`).

## 8. Correcciones aplicadas tras la auditoría (integrador, 2026-11-21)

Verificadas contra el servidor de producción reconstruido (`next build` + `npm run start`) con las mismas pruebas de ataque:

| ID | Corrección | Verificación |
|---|---|---|
| F1 | `dev` y `start` escuchan en `127.0.0.1` (`package.json`) | Log de Next: `Local/Network: http://127.0.0.1:3000` |
| F2 | `assertSameOrigin` en todas las rutas (`src/lib/api.ts`): rechaza `Sec-Fetch-Site: cross-site`, `Origin` ajeno o `null`, y Host no local (anti DNS rebinding; ampliable con `VQ_ALLOWED_HOSTS`). `readJson` exige `application/json` | POST text/plain → **415**; Origin `https://evil.example` → **403**; cross-site → **403**; mismo origen → 201 |
| F3 | `isPrivateIp` decodifica IPv4 embebida en IPv6 (mapeada en hex, compatible, NAT64) y bloquea multicast/link-local v6 | `[::ffff:127.0.0.1]`, `[::ffff:a9fe:a9fe]`, `0x7f000001` → "red privada o local"; test unitario ampliado (7 casos nuevos) |
| F4 | DNS que no resuelve → falla cerrado (excepción explícita `VQ_ALLOW_UNRESOLVED_DNS=1` para la nube detrás de proxy). **Pendiente:** fijar la IP validada en la conexión (TOCTOU de rebinding a nivel DNS) | Test unitario |
| F5 | `assertBodySize` antes de leer el cuerpo en narración y assets (exige `Content-Length`) | Content-Length enorme → **413** sin bufferizar |
| F6 | `require()` → `import`; 5 warnings corregidos | `npx eslint .` → 0 problemas |
| F7 | `colorSpace: "bt709"` en el worker | ffprobe del nuevo render final: `yuv420p`, `color_range=tv`, `color_space=bt709` (el MP4 de `docs/demo/` es este) |
| F8 | Columna `heartbeat_at` (migración 2), actualizada en cada progreso; el reaper marca error si el PID no vive **o** no hay latido en 5 min | Migraciones `[1, 2]` aplicadas sobre BD existente |
| F9 | Errores de ffprobe en importación → `NarrationError` genérico (400) | — |
| F10 | Rangos inválidos → **416** con `Content-Range: bytes */size` | `bytes=999999999-` → 416 |
| F11 | El worker borra `bundle-*` y `*.partial.mp4` huérfanos al arrancar | — |
| F13 | Límite por hora para ElevenLabs (`ELEVENLABS_MAX_CALLS_PER_HOUR`, 20 por defecto) | — |
| F14 | El resumen automático sin IA ya no se pasa al guion offline | — |

Sin corregir (aceptados para el MVP): F12 (políglotas de imagen, mitigado por `nosniff`), F15 (aviso de desviación de duración en la UI), F16 (warning experimental de `node:sqlite` en Node 22; desaparece con Node 24 LTS según su estado de estabilidad — no verificado aquí).

Estado final de calidad: `tsc` OK · `eslint .` 0 problemas · `vitest` 19/19 · `next build` sin advertencias.
