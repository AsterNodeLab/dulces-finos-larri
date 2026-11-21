# VisionQuant Studio

Estudio audiovisual local con IA para producir videos educativos verticales (TikTok / Reels, 1080×1920) de **Vision One** (IA aplicada) y **VisionQuant** (economía, mercados, tecnología).

```
IDEA / URL / NOTICIA → INVESTIGACIÓN → GUION → STORYBOARD → VOZ → ANIMACIÓN (Remotion) → MP4
```

Herramienta **privada y local**: Next.js + SQLite + Remotion. Funciona **sin claves de API** (modo demo/offline) y exporta MP4 real.

## Inicio rápido

**Windows:** `powershell -ExecutionPolicy Bypass -File scripts\windows\setup.ps1` y luego `scripts\windows\start.ps1`. Guía completa: [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md).

**Linux / macOS:**

```bash
npm ci
cp .env.example .env.local      # opcional: agrega claves
npm run db:seed-demo            # crea el proyecto demo
npm run dev                     # http://localhost:3000
```

Requisito: **Node.js ≥ 22.13** (usa `node:sqlite`, sin compilación nativa). FFmpeg no es necesario: Remotion trae sus binarios.

## Qué hace

| Módulo | Qué puedes hacer |
|---|---|
| Dashboard | Proyectos recientes, en producción, videos completados, estado de renders, plantillas, selector de marca |
| Investigación + Radar | Pegar URLs/textos/preguntas; fuentes con fecha y URL, primaria/secundaria; afirmaciones verificadas/no verificadas/en disputa; feeds RSS oficiales |
| Guion | Duración 15–90 s, 4 formatos (lanzamiento, tutorial, concepto, comparativa), audiencia, complejidad, estilo; edición por segmento, regeneración con IA, versiones, aprobación |
| Storyboard / Editor | 12 escenas configurables, orden, textos, duración, transición, cámara, subtítulos, música; previsualización con Remotion Player |
| Voz | Importar MP3/WAV/M4A (siempre), ElevenLabs (con clave), voz sintética demo; alineación por palabra; edición de subtítulos; SRT |
| Render | Previsualización rápida (540×960) y final 1080×1920 H.264/AAC; cola secuencial, progreso, cancelar, reintentar, descargar; verificación con ffprobe |
| Biblioteca / Calendario / Métricas | Ideas, investigaciones, guiones, videos; calendario editorial; métricas reales registradas o importadas por CSV |
| Recursos de marca | Referencias del personaje (frontal/lateral/manos), logos, imágenes y música con nota de licencia |

### Escenas (`remotion/scenes/`)
AnimatedHook · EditorialTitle · CrystalPresenter · ConceptDiagram · AIModelComparison · AnimatedWorkflow · FeatureExplainer · MetricCounter · TimelineScene · QuoteCard · SourceAttribution · BrandedOutro

### Plantillas
Technology News · AI Tutorial · AI Explainer (`src/shared/templates.ts`).

## Modo con y sin IA

| Sin claves (demo/offline) | Con `ANTHROPIC_API_KEY` |
|---|---|
| Investigación: extracción literal de oraciones marcadas "no verificado" | Resumen, ángulos y afirmaciones clasificadas solo a partir de las fuentes |
| Guion: esqueleto por formato con huecos `[Completa: …]` (bloquean la aprobación) | Guion completo con referencias a las afirmaciones |
| Storyboard determinista desde el guion | Motion Director: la IA elige escenas y props de la biblioteca validada (Zod) |
| Voz: importar audio o voz sintética demo | + ElevenLabs con timestamps exactos; + Whisper (OpenAI) para alinear audio importado |

La IA **nunca** produce código ejecutable: solo datos validados. Las claves van en `.env.local` y no salen del servidor.

## Proyecto demo

"¿Qué es un agente de inteligencia artificial y por qué importa?" (Vision One, 45 s objetivo). Incluye investigación demo, guion aprobado, storyboard de 6 escenas y narración **sintética** (espeak-ng + MBROLA, marcada como DEMO en el video). Renderizar sin la UI: `npm run render:demo`.

Video resultante incluido: [`docs/demo/demo-agente-ia.mp4`](docs/demo/demo-agente-ia.mp4).

## Comandos

```
npm run dev | build | start          app
npm run typecheck | lint | test      calidad
npm run doctor                       diagnóstico del entorno
npm run render:demo [-- --preview]   render de punta a punta sin UI
npm run render:worker                procesa la cola de render manualmente
npm run remotion:studio              diseñar escenas en Remotion Studio
npm run db:migrate | db:seed-demo    base de datos
npm run demo:voice                   regenera la voz demo (requiere espeak-ng)
npm run clean:tmp                    limpia temporales
```

## Arquitectura

```
src/shared/      contrato Zod (VideoSpec, escenas, guion, investigación), marcas, tokens, plantillas
src/app/         UI (Next.js App Router) + api/ (rutas locales, ver docs/API.md)
src/components/  ui/ (primitivas) + componentes de la app
src/lib/         db (node:sqlite), store, research, ai (proveedores + prompts), storyboard (Motion Director + sync),
                 narration, captions, render (backend desacoplado), security
remotion/        motor de video: composición, 12 escenas, primitivas, subtítulos
scripts/         worker de render, seed, doctor, scripts de Windows
data/            SQLite, media, renders, temporales (no versionado)
```

Separación explícita: **app web** ↔ **motor IA** (`src/lib/ai`, `storyboard`) ↔ **composiciones** (`remotion/`) ↔ **proceso de render** (`scripts/render-worker.ts`, `RenderBackend`) ↔ **almacenamiento** (`data/`).

## Documentación

- [docs/API.md](docs/API.md) — rutas de la API local
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — sistema de diseño (app y video)
- [docs/EDITORIAL_GUIDE.md](docs/EDITORIAL_GUIDE.md) — tono, estructuras, rúbrica pedagógica
- [docs/REMOTION_ARCHITECTURE.md](docs/REMOTION_ARCHITECTURE.md) — motor de video
- [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md) · [docs/OPENCODE_SETUP.md](docs/OPENCODE_SETUP.md)
- [docs/QA_REPORT.md](docs/QA_REPORT.md) — pruebas y limitaciones reales
- [docs/DECISIONS.md](docs/DECISIONS.md) · [docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md)
- [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) — guía para agentes de código

## Licencias

- **Remotion** tiene licencia propia: gratuita para individuos y empresas con fines de lucro de hasta 3 empleados; por encima se requiere Company License. Si VisionQuant Studio se convierte en un SaaS que renderiza para clientes, revisa https://remotion.dev/license antes de distribuirlo.
- Las voces MBROLA (demo) tienen licencia de uso no comercial: úsalas solo para pruebas.
- Música: solo archivos propios o con licencia adecuada (la app exige nota de licencia).
