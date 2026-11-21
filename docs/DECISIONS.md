# Registro de decisiones (ADR breve)

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| 1 | **Contrato Zod único** en `src/shared/` (VideoSpec, escenas, guion, investigación) | Todos (UI, API, IA, Remotion, worker) validan lo mismo; la IA solo produce datos | Tipos sueltos por módulo |
| 2 | **node:sqlite** (Node ≥ 22.13) | Cero compilación nativa en Windows; SQLite real con WAL y migraciones | better-sqlite3 (requiere binarios/compilación), Prisma (pesado) |
| 3 | **Worker de render como proceso separado** (`scripts/render-worker.ts`), cola secuencial en SQLite, `RenderBackend` desacoplado | Renders largos no viven en el servidor web ni en serverless; un render a la vez para 12 GB RAM; reemplazable por render cloud | Render dentro de la API route; Lambda en el MVP |
| 4 | **Una sola composición** `VisionQuantVideo` que renderiza cualquier VideoSpec; plantillas = secuencias de escenas | Videos modulares y editables, no monolíticos | Una composición por plantilla |
| 5 | **Transiciones de entrada** (no solapadas) | Duración total = suma de escenas → sincronía exacta con la narración | TransitionSeries (acorta la línea de tiempo) |
| 6 | **Sincronía por palabras**: inicio de escena = primera palabra de su narración | Las escenas se adaptan a la voz real, no al revés; el audio nunca se altera | Estirar audio / duraciones fijas |
| 7 | **Alineación**: ElevenLabs (exacta) → Whisper (si hay clave) → estimación anclada a silencios (ffmpeg silencedetect) | Funciona sin servicios de pago y lo declara como "estimada" | Exigir transcripción de pago |
| 8 | **Voz demo**: espeak-ng + MBROLA mx2, sintetizada por frase y versionada en `assets/demo/` | Demo legítimo sin claves; límites de frase exactos | Piper (modelos en HuggingFace bloqueados en la nube) |
| 9 | **Modo offline honesto**: investigación extrae oraciones literales ("no verificado"), guion = esqueleto con `[Completa: …]` que bloquea la aprobación | No inventar contenido cuando no hay IA | Texto de relleno generado por plantilla |
| 10 | **Motion Director** = IA elige escenas de la biblioteca + props → Zod; inválidas se reemplazan por versión determinista | Seguridad: nunca se ejecuta código del modelo | Que el modelo escriba JSX |
| 11 | fetch directo a APIs (sin SDKs) | Menos dependencias; mismo patrón para Anthropic/OpenAI/ElevenLabs | SDKs oficiales |
| 12 | UI con primitivas propias estilo shadcn (cva + tailwind-merge), sin Radix | El CLI de shadcn y Radix no aportan lo suficiente para una herramienta local | shadcn CLI completo |
| 13 | ffmpeg/ffprobe: sistema → binarios de Remotion | En Windows no hay que instalar FFmpeg | Exigir FFmpeg instalado |
| 14 | Coordinador del build: la sesión corrió con Claude **Opus 5.5** (no Sonnet 5.5: el modelo de la sesión no se puede cambiar desde dentro). La implementación de UI se delegó a un subagente **Sonnet 5.5 esfuerzo alto**; A–D en Opus 5.5 esfuerzo low; E en Haiku 5.5 esfuerzo low | Cumplir la asignación pedida en lo posible y documentar la diferencia | — |
