# Notas de investigación: VisionQuant Studio

Fecha de consulta: 2026-11-21. Etiquetas: **HECHO VERIFICADO**, **INFERENCIA**, **NO PUDE VERIFICAR**.

Nota de red: en esta sesión fallaron con "host no resuelve / fuera de dominios permitidos": `www.remotion.dev`, `elevenlabs.io`, `developers.openai.com`, `opencode.ai`. Para esos temas solo hay fuentes locales o no verificadas. Hay que añadir esos hosts a la lista de red de la sesión para verificarlos.

---

## 1. Licencia de Remotion

- **Fuente local:** `/home/user/dulces-finos-larri/node_modules/remotion/LICENSE.md` (paquete 4.0.545). Consultada 2026-11-21.
- **Fuente web:** https://www.remotion.dev/license. **NO PUDE VERIFICAR** (host bloqueado).

Hallazgos:
- **HECHO VERIFICADO:** Licencia gratuita para: individuos; organizaciones con fines de lucro de **hasta 3 empleados**; organizaciones sin ánimo de lucro; quien esté evaluando Remotion y no lo use aún comercialmente.
- **HECHO VERIFICADO:** Otras empresas necesitan **Company License** (de pago). El texto remite a remotion.dev/docs/license/pricing para precios. Precios: NO PUDE VERIFICAR.
- **HECHO VERIFICADO:** La licencia permite uso comercial para crear vídeos e imágenes. Prohíbe copiar o modificar Remotion para vender, alquilar, licenciar o sublicenciar un derivado propio.
- **HECHO VERIFICADO:** El propio archivo anuncia que en Remotion 5.0 la licencia cambiará (enlace a PR 3750). No se han revisado los detalles.
- **INFERENCIA:** Un SaaS que renderiza vídeos para clientes con Remotion es un uso "para crear vídeos" con fin comercial. Según el texto, eso está permitido, pero la empresa dueña del SaaS tiene que cumplir los límites de empleados de la licencia gratuita o comprar Company License. El texto no menciona explícitamente el modelo SaaS, así que conviene confirmarlo con Remotion (FAQ en remotion.dev/docs/license/faq, NO PUDE VERIFICAR).
- **INFERENCIA:** El límite de 3 empleados cuenta a la organización dueña del producto, no a los clientes. Confirmar antes de decidir.

---

## 2. API de Remotion 4.0.545 (tipos instalados)

Fuente: typings en `node_modules`. Versiones confirmadas: `remotion`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/player`, `@remotion/media`: todas **4.0.545**. Consultado 2026-11-21. **HECHO VERIFICADO** para todo lo de esta sección.

### 2.1 `bundle()` (`@remotion/bundler`, `dist/bundle.d.ts`)
- Firma recomendada: `bundle(options: BundleOptions)`, un objeto con `entryPoint: string` obligatorio.
- Opciones confirmadas: `entryPoint`, `publicDir: string | null`, `onProgress`, `webpackOverride`, `bundlerOverride`, `rspackOverride`, `outDir`, `enableCaching`, `publicPath`, `rootDir`, `ignoreRegisterRootWarning`, `gitSource`, `maxTimelineTracks`, `symlinkPublicDir`, entre otras.
- La forma posicional `bundle(entryPoint, onProgress?, options?)` queda como **legado** (`V4LegacyBundleOptions`). Usar la forma de objeto.
- Nota: `publicDir` existe, pero el nombre en la documentación de versiones antiguas puede diferir. Usar el nombre tal como aparece en el typing.

### 2.2 `selectComposition()` (`@remotion/renderer`)
- Firma: `selectComposition(options: SelectCompositionOptions): Promise<VideoConfig>`.
- Campos obligatorios: `serveUrl: string` (la URL devuelta por `bundle`), `id: string` (el id de la composición).
- Opcionales: `inputProps`, `envVariables`, `puppeteerInstance`, `onBrowserLog`, `browserExecutable`, `chromiumOptions`, `port`, `verbose`, y otros del `optionsMap.selectComposition`.
- Devuelve `VideoConfig`: `durationInFrames`, `fps`, `width`, `height`, etc.

### 2.3 `renderMedia()` (`@remotion/renderer`, `dist/render-media.d.ts`)
Firma: `renderMedia({ ...RenderMediaOptions }): Promise<RenderMediaResult>`.
Campos confirmados en `RenderMediaOptions`:
- `composition` (obligatorio, el `VideoConfig` devuelto por `selectComposition`), `serveUrl`, `codec: Codec` (**obligatorio**), `outputLocation?: string | null`.
- `inputProps?: Record<string, unknown>`.
- `crf?: number | null`.
- `onProgress?: RenderMediaOnProgress`.
- `chromiumOptions?: ChromiumOptions`.
- `scale?: number`.
- `cancelSignal?: CancelSignal`.
- `browserExecutable?: BrowserExecutable`.
- `concurrency?: number | string | null`.
- Los demás de la lista del destructuring (`x264Preset`, `audioCodec`, `audioBitrate`, `videoBitrate`, `pixelFormat`, `overwrite`, `muted`, `imageFormat`, `jpegQuality`, `hardwareAcceleration`, `frameRange`, etc.) también existen.

Diferencias respecto a lo que se espera:
- **HECHO VERIFICADO:** el parámetro de salida se llama `outputLocation`, no `output` ni `outputFile`.
- **HECHO VERIFICADO:** `codec` es obligatorio en `renderMedia`. No tiene valor por defecto en la firma.
- **HECHO VERIFICADO:** la cancelación no es un `AbortSignal`. Es `cancelSignal: CancelSignal`, que es `(callback: () => void) => void`. Se obtiene de `makeCancelSignal()`, que devuelve `{ cancelSignal, cancel }`.
- **HECHO VERIFICADO:** `scale` es un número, no un string.

### 2.4 `ensureBrowser()`
- Firma: `ensureBrowser(options?: EnsureBrowserOptions): Promise<BrowserStatus>` (`@remotion/renderer/dist/ensure-browser.d.ts`).
- **HECHO VERIFICADO:** existe y es opcional en sus opciones. No se revisaron los campos de `EnsureBrowserOptions`.

### 2.5 Componente de audio actual
- **HECHO VERIFICADO:** `remotion` 4.0.545 exporta `Audio` y `Html5Audio`. `Audio` está marcado como **`@deprecated`**: "This component has been renamed to `Html5Audio`" (`remotion/dist/cjs/audio/html5-audio.d.ts`).
- **HECHO VERIFICADO:** Usar **`Html5Audio`**.
- **HECHO VERIFICADO:** El paquete `@remotion/media` (4.0.545) existe localmente. Su documentación enlaza a "mediabunny/new-video", lo que sugiere una API nueva para vídeo y audio. No se revisó su API de audio.
- **INFERENCIA:** Para el render con audio, empezar con `Html5Audio`. Evaluar `@remotion/media` solo si se necesita algo que `Html5Audio` no cubre.

### 2.6 `@remotion/player` `Player`
- **HECHO VERIFICADO** en `PlayerProps` (`@remotion/player/dist/cjs/Player.d.ts`): `durationInFrames`, `compositionWidth`, `compositionHeight`, `fps`, `controls?`, `loop?`, `autoPlay?`, `style?`, `acknowledgeRemotionLicense?` (línea 68).
- **HECHO VERIFICADO:** `controls` y `acknowledgeRemotionLicense` existen.
- **NO PUDE CONFIRMAR:** `inputProps` no aparece en `Player.d.ts` con ese nombre. Aparece en los componentes internos (`PlayerUI`, `SharedPlayerContext`, `ThumbnailUI`). Hay que revisar cómo `PlayerProps` tipa las props de la composición (el tipo es genérico `PlayerProps<Schema, Props>`). Verificarlo antes de usar `inputProps`.

---

## 3. ElevenLabs: TTS con timestamps

Fuente oficial: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps. **NO PUDE VERIFICAR** (host bloqueado).

Lo local (`node_modules/@remotion/elevenlabs`) es la transcripción de STT y el formato de transcripción, no el endpoint de TTS. No confirma el endpoint `POST /v1/text-to-speech/{voice_id}/with-timestamps`.

Lo que se conoce de la API, sin verificación en esta sesión (**NO PUDE VERIFICAR**):
- Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps`.
- Auth: cabecera `xi-api-key: <key>`.
- Body: `text`, `model_id`, `voice_settings`, y `output_format` (como query param o campo, revisar).
- Respuesta: `audio_base64`, `alignment` con `characters`, `character_start_times_seconds`, `character_end_times_seconds`. Algunas versiones devuelven también `normalized_alignment`.
- Modelo multilingüe para español: no verificado. El candidato más probable es un modelo `eleven_multilingual_v2`. Confirmar en la documentación de modelos.

---

## 4. Anthropic Messages API

Fuente: https://platform.claude.com/docs/en/models/overview. Consultada 2026-11-21. **HECHO VERIFICADO** (página leída con WebFetch).

Modelos y precios (USD por millón de tokens, entrada / salida):

| Modelo | ID de API | Entrada | Salida |
|---|---|---|---|
| Claude Fable 5.2 | `claude-fable-5-2` | $8 | $40 |
| Claude Opus 5.5 | `claude-opus-5-5` | $4 | $20 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 |
| Claude Haiku 5.5 | `claude-haiku-5-5` | desde $0.10 | desde $0.50 |

- **HECHO VERIFICADO:** los cuatro IDs del entorno existen en la página. Contexto 1M tokens, salida máx. 128K tokens.
- **HECHO VERIFICADO:** el lote (Batch API) tiene 50% de descuento. La lectura de caché cuesta 10% del precio base de entrada (5% en Opus 5.5 y Sonnet 5.5).
- **INFERENCIA:** hay también otros modelos listados (Opus 5, Sonnet 5, Fable 5.1, etc.). El `claude-fable-5-2` es el más caro. Usar Opus 5.5 o Sonnet 5.5 para la mayoría de tareas.
- **HECHO VERIFICADO:** la página indica que el pensamiento es adaptativo y que `thinking: {type: "enabled", budget_tokens}` no se acepta en los modelos nuevos (tipo "enabled" queda como legado).
- **NO PUDE VERIFICAR (headers):** endpoint `POST https://api.anthropic.com/v1/messages`, cabecera `x-api-key`, y valor de `anthropic-version`. La página no lo mostró. El valor habitual conocido es `2023-06-01`, pero no está confirmado para esta fecha. Confirmar en docs de la API o con el skill `claude-api`.

---

## 5. OpenAI: transcripción con timestamps de palabra

Fuente oficial: https://developers.openai.com/api/docs/guides/speech-to-text. **NO PUDE VERIFICAR** (host bloqueado).

Evidencia local (`node_modules/@remotion/openai-whisper`), **HECHO VERIFICADO** en el código:
- El paquete exige `response_format: verbose_json` y `timestamp_granularities: ["word"]` (o segmentos temporizados). El mensaje de error dice: "Export verbose_json with timestamp_granularities: ["word"] or timed segments."
- Se leen `segments` con `start` y `end`.

Lo que no se pudo verificar:
- Endpoint: `POST https://api.openai.com/v1/audio/transcriptions`.
- Modelo: `whisper-1` (confirmado como compatible con `verbose_json` en el código local). Modelos nuevos (p. ej. `gpt-4o-transcribe`): **NO PUDE VERIFICAR** si aceptan `timestamp_granularities`.
- Forma exacta de `words`: se espera `[{ "word", "start", "end" }]`. **NO PUDE VERIFICAR** en la fuente oficial.

---

## 6. OpenCode (sst/opencode)

Fuente oficial: https://opencode.ai/docs/config/. **NO PUDE VERIFICAR** (host bloqueado). No hay copia local.

Lo que se conoce de forma no verificada en esta sesión:
- Archivos de configuración: `opencode.json` o `opencode.jsonc` en la raíz del proyecto. Schema: `https://opencode.ai/config.json`. Claves: `model`, `provider`, `agent`, `instructions`. NO PUDE VERIFICAR.
- Lee `AGENTS.md` en la raíz: NO PUDE VERIFICAR.
- Instalación en Windows: NO PUDE VERIFICAR (npm global o binario).
- API key de Anthropic: env var `ANTHROPIC_API_KEY` o comando `opencode auth login`: NO PUDE VERIFICAR.

Recomendación: no tomar decisiones de configuración hasta verificar con la documentación oficial.

---

## 7. Safe zones TikTok e Instagram Reels (1080x1920)

Fuente: búsqueda web (WebSearch) de 2026-11-21. Fuentes secundarias (blogs y herramientas, no oficiales). **HECHO VERIFICADO** solo de que las fuentes existen; los valores no están confirmados por las plataformas.

- https://www.ignitesocialmedia.com/content-creation/what-are-the-safe-zones-for-tiktoks-and-instagram-reels/
- https://www.socialync.io/tools/safe-zones/tiktok
- https://moda.app/tools/story-safe-zone-checker
- https://adaptlypost.com/blog/social-media-safe-zones-2026-complete-guide
- https://reap.video/blog/short-form-video-safe-zones

Valores encontrados (px sobre 1080x1920):
- **TikTok** (la cifra más citada, de varias guías): superior 108, inferior 320, izquierda 60, derecha 120. Socialync: superior 240, inferior 660, laterales 120. Moda: superior ~130, inferior ~480, derecha ~150.
- **Instagram Reels**: Ignite: zona central 1010x1280, a 220 px del borde superior y 420 px del inferior. Adaptly: zona central 996x1400, superior 210, inferior 310.

Conclusión:
- **INFERENCIA:** usar como punto de partida una zona segura de ~ superior 220, inferior 420 (o 320 para TikTok), derecha 120 y izquierda 60. Probar con la vista previa de cada app.
- **NO PUDE VERIFICAR:** especificación oficial de TikTok o Meta para orgánico. Las cifras son de guías de anuncios.

---

## 8. `node:sqlite` en Node 22.x y 24.x

Fuente: https://nodejs.org/api/sqlite.html. Consultada 2026-11-21. **HECHO VERIFICADO** en la página (leída con WebFetch; la última parte de la página, más de 100000 caracteres, no se leyó).

- Estabilidad: **1.2, Release candidate** ("Stability: 1.2 - Release candidate").
- Añadido en **v22.5.0**, detrás de `--experimental-sqlite`.
- **v22.13.0** y **v23.4.0**: ya no requiere la bandera; sigue siendo experimental.
- **v25.7.0**: pasa a release candidate.
- Node 22.x (LTS): desde 22.13.0 se puede usar sin bandera. El módulo sigue siendo experimental y emite aviso.
- Node 24.x: **INFERENCIA** de que no requiere bandera. La página no muestra una entrada específica de 24.x y no confirma el nivel de estabilidad en 24.x. **NO PUDE VERIFICAR** el nivel en 24.x.
- Entorno local: Node `v22.23.5`. Con esta versión, `node:sqlite` no requiere bandera (según la entrada 22.13.0).

---

## Resumen de temas no verificados (por falta de acceso)

- 1: precios y FAQ de Remotion (remotion.dev bloqueado).
- 3: ElevenLabs entero (elevenlabs.io bloqueado). Endpoint y formato son no verificados.
- 4: `anthropic-version` y endpoint (no mostrados en la página de modelos).
- 5: OpenAI entero (developers.openai.com bloqueado), salvo la evidencia local de `verbose_json`.
- 6: OpenCode entero (opencode.ai bloqueado).
- 2.6: `inputProps` en `Player` (nombre no hallado en `Player.d.ts`).
- 8: estabilidad de `node:sqlite` en Node 24.x.

Hosts a permitir en la sesión para completar: `www.remotion.dev`, `elevenlabs.io`, `developers.openai.com`, `opencode.ai`.
