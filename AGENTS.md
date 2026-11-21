# AGENTS.md — guía para agentes de código (OpenCode, Claude Code, Codex)

VisionQuant Studio es una herramienta **local y privada** que convierte una idea en un video vertical MP4
(1080×1920) para TikTok/Reels: **investigación → guion → storyboard → voz → animación (Remotion) → render**.
Marcas: **Vision One** (IA, acento cian) y **VisionQuant** (economía/mercados, acento dorado). Nunca se mezclan:
cada proyecto tiene `brand` y el backend lo impone al guardar el storyboard.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `npm ci` (Windows: `scripts\windows\setup.ps1`) |
| Desarrollo | `npm run dev` → http://localhost:3000 |
| Tipos / lint / pruebas / build | `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` |
| Diagnóstico del entorno | `npm run doctor` |
| Render del demo sin UI | `npm run render:demo` (`-- --preview` para 540×960) |
| Remotion Studio (diseñar escenas) | `npm run remotion:studio` |
| Migraciones / demo | `npm run db:migrate` · `npm run db:seed-demo` |

Verifica siempre con `npm run typecheck && npm test` antes de terminar; si tocas escenas, renderiza (`npm run render:demo -- --preview`) y revisa fotogramas.

## Mapa del código

- `src/shared/` — **contrato** (Zod): `schema.ts` (VideoSpec, 12 escenas, guion, investigación…), `brands.ts`, `tokens.ts`, `templates.ts`. Código puro: lo importan la app, la API, el worker y Remotion.
- `remotion/` — motor de video. `VideoComposition.tsx` renderiza cualquier `VideoSpec` válido; `scenes/` (12 escenas), `primitives/`, `captions/`. **Imports relativos** (el bundler de Remotion no resuelve `@/`).
- `src/lib/` — servidor: `db/` (node:sqlite + migraciones), `store.ts` (repositorio), `research/`, `script-service.ts`, `storyboard/` (Motion Director + sincronía), `narration/`, `captions/`, `render/` (backend desacoplado), `ai/` (proveedores + prompts), `security/`.
- `src/app/api/**` — rutas (ver `docs/API.md`). `src/app/(páginas)` y `src/components/` — UI.
- `scripts/render-worker.ts` — proceso de render **separado** del servidor web; cola secuencial.
- `src/content/` — plantillas de guion y proyecto demo.
- `data/` — SQLite, media, renders, temporales (ignorado por git).

## Reglas

1. **El contrato manda.** Cambios de datos: primero `src/shared/schema.ts`, luego productor y consumidor. Nueva escena: schema → componente en `remotion/scenes/` → registro en `remotion/scenes/index.tsx` → `SCENE_CATALOG` en `src/lib/ai/prompts.ts`.
2. **Nunca ejecutar código generado por un modelo.** La IA solo produce datos (JSON) validados con Zod que eligen componentes de la biblioteca. Componentes personalizados futuros requieren revisión humana y render aislado.
3. **No inventar hechos.** Fechas, precios, benchmarks, funciones de modelos y métricas solo desde fuentes registradas o del usuario. Sin IA, todo lo extraído queda "no verificado". No hay métricas ficticias.
4. **Secretos solo en `.env.local`.** Nunca en código, nunca al cliente (no usar `NEXT_PUBLIC_` para claves).
5. **Portabilidad Windows:** rutas con `path`, nada de comandos de shell POSIX en runtime, `spawn(process.execPath, ...)` en vez de `npx`. Sin dependencias nativas que compilen (por eso `node:sqlite`).
6. **Rendimiento (Ryzen 5 3500U, 12 GB, Vega 8):** animaciones por `transform`/`opacity`, sin blur grande ni `backdrop-filter`, un render a la vez, `RENDER_CONCURRENCY=2`.
7. **Animación por frames** (`useCurrentFrame`, `interpolate`, `spring`); la duración total = suma de escenas; las transiciones son de entrada, no solapan escenas.
8. Español de México en UI, docs y comentarios; identificadores en inglés.
9. Si el usuario dice "no cambies nada más", cambia solo lo pedido.

## Documentación

`README.md` · `docs/API.md` · `docs/DESIGN_SYSTEM.md` · `docs/EDITORIAL_GUIDE.md` · `docs/REMOTION_ARCHITECTURE.md` · `docs/WINDOWS_SETUP.md` · `docs/OPENCODE_SETUP.md` · `docs/QA_REPORT.md` · `docs/DECISIONS.md`
