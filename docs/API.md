# API local de VisionQuant Studio

Todas las rutas viven en `src/app/api/**/route.ts` (runtime Node, sin caché). Respuestas JSON; los errores tienen la forma `{ error: string, issues?: {path, message}[] }` con códigos 400/404/409/413/429/502/500. Los tipos están en `src/shared/schema.ts`.

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/api/health` | — | `{ ok, providers:{anthropic,anthropicModel,openai,elevenlabs,elevenlabsModel}, tools:{ffmpeg,ffprobe,demoTts}, render:{...}, mode:"ai"\|"offline" }` |
| GET | `/api/templates` | — | `{ templates: TemplateDefinition[], scriptFormats: Record<ContentFormat, ScriptTemplate>, brands: Record<BrandId, BrandProfile> }` |
| POST | `/api/demo` | — | `{ project, created }` crea el proyecto demo si no existe |
| GET | `/api/projects?brand=&status=` | — | `{ projects: Project[], lastRender: Record<projectId, RenderJob\|null> }` |
| POST | `/api/projects` | `CreateProjectInput` `{title, brand, template, idea?, scheduledFor?}` | `{ project }` |
| GET | `/api/projects/:id` | — | `{ project, research: Research\|null, script: Script\|null, scriptVersions, storyboard: {spec, provider, updatedAt}\|null, narration: Narration\|null, renders: RenderJob[], usage }` |
| PATCH | `/api/projects/:id` | `{title?, template?, status?, idea?, scheduledFor?, publishedAt?}` | `{ project }` |
| DELETE | `/api/projects/:id` | — | `{ ok }` (borra archivos también) |
| POST | `/api/projects/:id/research` | `{ inputs: {kind:"url"\|"text"\|"question", value, title?}[], mode?: "append"\|"replace", analyze?: boolean }` | `{ research, report:{added, errors:{input,error}[]} }` |
| PUT | `/api/projects/:id/research` | `{ summary, angles, sources: Source[], claims: Claim[] }` (edición manual; cambiar status de claims) | `{ research }` |
| GET | `/api/radar?force=1` | — | `{ items:{title,url,publishedAt,feed,brand}[], feeds:{label,url,ok,error?,count}[], fetchedAt }` |
| POST | `/api/projects/:id/script` | `{ settings: ScriptSettings }` `{targetDuration:15\|30\|45\|60\|90, format, audience, complexity, style}` | `{ script }` (IA o esqueleto offline con `[Completa: …]`) |
| PUT | `/api/projects/:id/script` | `{ segments: ScriptSegment[], settings }` | `{ script }` (nueva versión; des-aprueba) |
| POST | `/api/projects/:id/script/regenerate` | `{ segmentId, instruction }` | `{ script }` (requiere IA; 400 si no hay clave) |
| POST | `/api/projects/:id/script/approve` | — | `{ script }` (400 si quedan `[Completa:`) → estado `production` |
| POST | `/api/projects/:id/storyboard` | `{ useAi?: boolean }` | `{ storyboard: {spec, provider, updatedAt, rejected} }` (requiere guion aprobado) |
| PUT | `/api/projects/:id/storyboard` | `{ spec: VideoSpec }` | `{ storyboard }` (re-sincroniza con la narración) |
| GET | `/api/projects/:id/preview-spec` | — | `{ spec: VideoSpec, assetBaseUrl: "/api/media/" }` → props del Player |
| POST | `/api/projects/:id/narration` | multipart `file` (mp3/wav/m4a) | `{ narration }` |
| POST | `/api/projects/:id/narration/generate` | `{ provider: "elevenlabs"\|"demo-tts" }` | `{ narration }` |
| POST | `/api/projects/:id/narration/realign` | — | `{ narration }` |
| PUT | `/api/projects/:id/narration` | `{ words: WordTiming[] }` (editar subtítulos) | `{ narration }` |
| DELETE | `/api/projects/:id/narration` | — | `{ ok }` |
| GET | `/api/projects/:id/captions.srt` | — | archivo SRT |
| POST | `/api/projects/:id/render` | `{ quality: "preview"\|"final" }` | 202 `{ job }` |
| GET | `/api/render-jobs?projectId=` | — | `{ jobs }` |
| GET | `/api/render-jobs/:id` | — | `{ job }` (sondear cada ~1.5 s mientras `queued/bundling/rendering`) |
| POST | `/api/render-jobs/:id/retry` | — | 202 `{ job }` (nuevo job) |
| POST | `/api/render-jobs/:id/cancel` | — | `{ job }` |
| GET | `/api/render-jobs/:id/download[?inline=1]` | — | MP4 (Range) |
| GET | `/api/media/<ruta>` | — | audio/imagen de `data/media` (Range) |
| GET/POST | `/api/assets?brand=` | POST multipart: `file, brand, kind, label, licenseNote` (música exige licencia; PNG/JPG/WEBP o MP3/WAV/M4A) | `{ assets }` / `{ asset }` |
| DELETE | `/api/assets/:id` | — | `{ ok }` |
| GET/POST | `/api/projects/:id/metrics` | `{ platform, url?, views?, likes?, comments?, shares?, saves?, recordedAt? }` | `{ metrics }` / `{ metric }` |
| POST | `/api/projects/:id/metrics/import` | `{ csv }` encabezados `platform,url,views,likes,comments,shares,saves,recorded_at` | `{ added, errors }` |
| DELETE | `/api/metrics/:id` | — | `{ ok }` |
| GET | `/api/projects/:id/usage` | — | `{ calls, estTotalUsd, hasUnpricedCalls }` |
| GET/PUT | `/api/settings` | PUT `{ defaultBrand?, defaultTargetDuration?, defaultAudience?, captionsMaxChars? }` | `{ settings, providers, render, envFile }` |

## Flujo de estados del proyecto

`idea` → (investigación guardada) `research` → (guion creado) `script` → (guion aprobado / storyboard) `production` → (render final listo) `review` → (PATCH manual) `approved` → (PATCH manual al publicar) `exported`.

## Player

```tsx
import { Player } from "@remotion/player";
import { VideoComposition } from "../../remotion/VideoComposition"; // ruta relativa
import { totalDurationInFrames } from "@/shared/schema";
<Player component={VideoComposition} inputProps={{ spec, assetBaseUrl: "/api/media/" }}
  durationInFrames={totalDurationInFrames(spec)} fps={spec.fps}
  compositionWidth={spec.width} compositionHeight={spec.height} controls acknowledgeRemotionLicense />
```
