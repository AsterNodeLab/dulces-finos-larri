# Arquitectura de Remotion — VisionQuant Studio

El motor de video convierte un `VideoSpec` **validado** (ver `src/shared/schema.ts`) en frames 1080x1920.
Todo vive en `remotion/`; el contrato (`src/shared/*`) no se modifica desde aquí.

## Mapa de archivos

| Archivo | Rol |
|---|---|
| `remotion/index.ts` | `registerRoot(RemotionRoot)` (CLI, Studio, worker). |
| `remotion/Root.tsx` | Composiciones `VisionQuantVideo` y `SceneGallery`. Ambas validan props con `CompositionPropsSchema` y usan `calculateMetadata` (duración = `totalDurationInFrames(spec)`, fps/ancho/alto del spec). |
| `remotion/VideoComposition.tsx` | `VideoComposition(props: CompositionProps)`. Importable en el navegador por `@remotion/player` (sin Node, imports relativos). |
| `remotion/fixtures/gallery-spec.ts` | `gallerySpec`: los 12 tipos de escena (3 s c/u), marca `vision-one`, subtítulos estimados, sin audio. |
| `remotion/fonts.ts` | Fraunces / Inter / JetBrains Mono vía `@fontsource-variable` (offline) + `waitForFonts()`. |
| `remotion/lib/assets.ts` | `resolveAsset(path, assetBaseUrl)`. |
| `remotion/captions/pages.ts` | `buildCaptionPages(words, maxCharsPerLine, fps)` y `normalizeWord()` — TS puro, reutilizable por la app. |
| `remotion/captions/Captions.tsx` | Capa de subtítulos. |
| `remotion/scenes/*.tsx` | Un componente por tipo de escena. |
| `remotion/scenes/index.tsx` | `SceneRenderer`: switch exhaustivo `scene.type → componente`. |
| `remotion/primitives/` | `Background`, `SceneFrame` (transición + cámara), `layout` (zonas, tipografía), `Reveal` (revelados, spring), `easing`, `Icon` (18 íconos), `CrystalAvatar`, `Hand`, `Pointer`/`Highlight`. |

## De VideoSpec a frames

1. La app/worker valida el spec con `VideoSpecSchema` y lo pasa como `{ spec, assetBaseUrl }`.
2. `calculateMetadata` vuelve a validar con `CompositionPropsSchema` y fija duración/fps/tamaño.
3. `VideoComposition` monta capas: `Background` → `<Series>` de escenas (cada una en `SceneFrame`) → `Captions` → marca de demo (“DEMO · voz sintética”, arriba-izquierda) y firma de marca (arriba-derecha) → `Html5Audio` de narración y música (volumen máx. 0.35), ambos desde el frame 0.
4. `useFontsReady()` bloquea con `delayRender` hasta que `document.fonts` cargó las fuentes (timeout 15 s).

## Regla de tiempo

- Duración total = **Σ `scene.durationInFrames`**, exacta. La escena N empieza en la suma de las anteriores (`<Series>`).
- No se usa `TransitionSeries` (solaparía y acortaría el timeline, rompiendo la sincronía con la voz).
- `transition` (`none|fade|slide-up|wipe`) es una animación de **entrada** dentro de los primeros 12 frames de la escena.
- `camera` (`static|push-in|drift`) es una transformación sutil sobre la escena completa.
- Dentro de cada escena los elementos se revelan escalonados (`staggerFrames`, `fitSpan`), en el orden de la narración, y TODO queda revelado antes de `min(75 % de la escena, duración − 12)` (`revealDeadline`). Las escenas cortas comprimen el escalonado.
- Tamaños mínimos en pantalla: etiquetas mono ≥ 24 px (marca de demo 22 px), cuerpo ≥ 34 px (forzado en `monoStyle`/`bodyStyle`).
- Subtítulos: tiempos de palabra en segundos desde el inicio del audio → frames globales.

## Assets

`resolveAsset(path, null)` → `staticFile(path)` (el worker empaqueta con `publicDir = data/media`).
`resolveAsset(path, "/api/media/")` → `"/api/media/" + segmentos codificados con encodeURIComponent`. Se descartan segmentos `.`/`..`.

## Subtítulos

`buildCaptionPages`: páginas de ≤ 2 líneas, ninguna línea > `maxCharsPerLine` (salvo una palabra más larga por sí sola), corte de página tras `.?!…` o pausa > 0.35 s, coma con línea medio llena → salto. Render: Inter 600 58 px, placa oscura translúcida sin blur, palabra actual subrayada, `keywords` en color de acento (comparación sin acentos y minúsculas). Posición `lower`: borde inferior en y = 1920 − 380 − 40; `middle`: centrado en y ≈ 1150.

## Cómo agregar un tipo de escena (de forma segura)

1. **Contrato**: el dueño de `src/shared/schema.ts` agrega `XxxProps` (con límites de longitud), el literal en `SCENE_TYPES` y la rama en `SceneSchema`.
2. **Componente**: `remotion/scenes/Xxx.tsx` exportando `Xxx: React.FC<SceneComponentProps<"Xxx">>`. Solo animación por frames (`useCurrentFrame`, `interpolate` con clamp, `spring`; `random(seed)` si hace falta). Colores solo de `brand.colors`/`palette`. Contenido dentro de `CONTENT` (x 72–920, y 250–1290).
3. **Registro**: agregar el `case` en `remotion/scenes/index.tsx`. Si falta, `assertNever` hace fallar `tsc`.
4. Agregar un ejemplo a `fixtures/gallery-spec.ts` y revisar stills.

## Regla de seguridad

- La composición **solo** renderiza `VideoSpec` que pasaron el schema Zod. La IA produce datos (JSON), nunca código.
- El código React generado por un modelo **jamás se ejecuta**. Cualquier componente personalizado futuro requiere revisión humana del código y un render en sandbox (proceso aislado, sin red ni credenciales) antes de entrar al registro.
- Las rutas de assets se normalizan (`..` descartado) y en el navegador se sirven solo vía `/api/media/`.

## Rendimiento (Windows, GPU integrada tipo Ryzen 5 3500U)

- Sin `backdrop-filter`, sin blur CSS, sin sombras grandes en capas de pantalla completa.
- Fondo: un SVG con `pattern` + 6 trazos; animado solo con `transform`.
- Animaciones con `opacity`/`transform`/`stroke-dashoffset`; perspectiva 2.5D solo en tarjetas pequeñas.
- `premountFor={15}` en cada escena para evitar saltos al montar.
- Render recomendado: `--concurrency=2`, formato de imagen jpeg (ver `remotion.config.ts`). La galería de 36 s tardó ~1 min 40 s en Linux con concurrency 2.
