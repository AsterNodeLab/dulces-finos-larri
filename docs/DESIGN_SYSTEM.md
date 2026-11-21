# Sistema de diseño — VisionQuant Studio

Fuente de verdad de valores: `src/shared/tokens.ts` y `src/shared/brands.ts`. Implementación web: `src/app/globals.css` (Tailwind v4) y `src/components/ui/`.

## 1. Principios

1. **Editorial.** Cada pantalla y cada cuadro se leen como una página bien compuesta: titular serif, cuerpo sans, datos en mono.
2. **Precisión.** Medidas en múltiplos de 4 px; los números van en mono tabular; toda cifra lleva fuente.
3. **Espacio negativo.** El vacío es jerarquía. Preferir quitar un elemento a añadir un borde.
4. **Claridad de datos.** Un gráfico = una idea. Escala visible, unidad visible, fuente visible.
5. **Función antes que efecto.** Cada animación debe *explicar la narración*; si no explica nada, se elimina.

**Anti-patrones prohibidos:** degradados morados/genéricos de "IA", estética infantil (emojis decorativos, ilustraciones redondeadas tipo mascota), cyberpunk saturado (neón, glitch, glow), look CapCut (subtítulos gigantes palabra por palabra con rebote, stickers, zoom punch), efectos decorativos (blur pesado, sombras largas, partículas, brillos), más de dos acentos en una misma vista.

## 2. Color

### 2.1 Roles (token CSS → valor)

| Rol | Token Tailwind | Vision One | VisionQuant |
|---|---|---|---|
| Fondo | `bg-bg` | petrol-900 `#071320` | petrol-950 `#040B14` |
| Superficie (tarjetas, paneles) | `bg-surface` | petrol-800 `#0C1D2E` | petrol-900 `#071320` |
| Elevado (hover, inputs activos, popovers) | `bg-raised` | petrol-700 `#13293F` | petrol-800 `#0C1D2E` |
| Línea hairline | `border-line` | ivory 12 % | gold 16 % |
| Línea fuerte | `border-line-strong` | ivory 22 % | gold 28 % |
| Texto | `text-fg` | ivory-100 `#F7F2E8` | ivory-100 |
| Texto secundario | `text-muted` | slate-300 `#9AABBD` | slate-300 |
| Texto terciario (placeholder, meta) | `text-subtle` | slate-400 `#6F8399` | slate-400 |
| Acento | `accent` | **cian** `#4BD9E8` | **dorado** `#D8BD80` |
| Acento 2 | `accent-2` | dorado | cian |
| Texto sobre acento | `text-on-accent` | petrol-900 | petrol-900 |
| Éxito | `success` | `#7FD1A8` | igual |
| Peligro | `danger` | `#E8735A` | igual |

El cambio de marca es un atributo: `<html data-brand="visionquant">`. Sin atributo = Vision One. Los componentes solo usan tokens semánticos; nunca `cyan-400` directo salvo para identificar explícitamente una marca.

Proporción de uso por vista: ~85 % fondo/superficie, ~12 % texto, ≤3 % acento. El acento marca *una* acción o *un* dato por vista.

### 2.2 Contraste (WCAG 2.x, calculado)

| Texto \ Fondo | petrol-950 | petrol-900 | petrol-800 | petrol-700 |
|---|---|---|---|---|
| ivory-100 | 17.70 | 16.76 | 15.29 | 13.29 |
| slate-300 (muted) | 8.40 | 7.96 | 7.26 | 6.31 |
| slate-400 (subtle) | 5.06 | 4.79 | 4.37 ⚠ | 3.80 ⚠ |
| cyan-400 | 11.65 | 11.03 | 10.07 | 8.75 |
| gold-400 | 10.83 | 10.25 | 9.35 | 8.13 |
| danger | 6.61 | 6.26 | 5.71 | 4.96 |
| success | 10.90 | 10.32 | 9.41 | 8.18 |

- petrol-900 sobre cian (botón primario V1): **11.03**; sobre dorado (VQ): **10.25**.
- Todos AA (≥4.5) excepto `subtle` sobre petrol-800/700: úsese solo para texto ≥18 px, placeholders o metadatos no esenciales; en superficies elevadas usar `muted`.

## 3. Tipografía

| Familia | Token | Uso |
|---|---|---|
| Fraunces Variable | `font-serif` | Titulares, títulos de tarjeta, números hero |
| Inter Variable | `font-sans` | UI, cuerpo, subtítulos de video |
| JetBrains Mono Variable | `font-mono` | Datos, etiquetas, eyebrows (MAYÚSCULAS, tracking 0.08–0.14em), timecodes |

Carga: el layout raíz importa `@fontsource-variable/inter`, `@fontsource-variable/fraunces`, `@fontsource-variable/jetbrains-mono`.

### 3.1 Escala de la app

| Nombre | Familia | px / interlínea | Peso | Tracking |
|---|---|---|---|---|
| display | serif | 40 / 48 | 500 | −0.015em |
| h2 (sección) | serif | 28 / 36 | 500 | −0.015em |
| h3 (tarjeta, diálogo) | serif | 20 / 28 | 500 | −0.01em |
| body | sans | 14 / 22 | 400 | 0 |
| body-lg | sans | 16 / 26 | 400 | 0 |
| small | sans | 13 / 20 | 400–500 | 0 |
| caption | sans | 12 / 16 | 400 | 0 |
| eyebrow | mono | 11 / 16 | 400 | 0.14em, mayúsculas (`.eyebrow`) |
| data | mono | 13 / 20 | 400 | tabular-nums (`.tabular`) |

### 3.2 Escala de video (1080×1920)

| Rol | Familia | px / interlínea | Peso | Notas |
|---|---|---|---|---|
| headline | serif | 96 / 104 | 500 | máx. 3 líneas, −0.02em |
| title | serif | 68 / 78 | 500 | máx. 3 líneas |
| body | sans | 44 / 58 | 500 | máx. 4 líneas, ~28 caracteres/línea |
| caption (subtítulo) | sans | 40 / 52 | 600 | máx. 2 líneas, sin rebote |
| label / eyebrow | mono | 34 / 44 | 500 | mayúsculas, 0.12em |
| dato hero | serif o mono | 160–220 | 400 | tabular |

**Mínimo absoluto en pantalla: 34 px.** Fuente de un dato (“Fuente: …”) también ≥34 px en mono `muted`.

## 4. Espacio, radios, bordes, elevación, iconos

- **Espaciado base 4:** 0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Padding de tarjeta 24; separación entre secciones 48–64; gutter de página 32 (≥1280) / 24.
- **Radios:** sm 6 (badges, kbd), md 10 (botones, inputs), lg 16 (tarjetas, diálogos), xl 24 (preview de video), pill 999 (status).
- **Bordes:** hairline 1 px `border-line` en lugar de sombras. Hover → `line-strong`. Foco → anillo 2 px `accent` con offset 2.
- **Elevación:** tres planos por color (bg → surface → raised). Sombra solo en diálogos y toasts (`0 24px 64px -24px rgb(0 0 0/.6)`), nunca en tarjetas.
- **Iconos:** línea 2 px, 24×24 viewBox, extremos redondeados, `currentColor`. Tamaños 14/16/20. `<Icon name="…" />` en `icons.tsx`. Sin iconos rellenos ni multicolor.

## 5. Movimiento

### 5.1 UI
| Token | Valor | Uso |
|---|---|---|
| fast | 120 ms | hover, color |
| base | 180 ms | aparición (`animate-fade-in`) |
| slow | 260 ms | diálogo/toast (`animate-rise-in`, 6 px) |
| ease-out | `cubic-bezier(0.25,1,0.5,1)` (`ease-out-quart`) | entradas |
| ease-in-out | `cubic-bezier(0.76,0,0.24,1)` | cambios de layout |

Respetar `prefers-reduced-motion` (ya en globals.css).

### 5.2 Video (30 fps)
- **Entrada:** 12 frames (opacidad 0→1 + translateY 24→0 px).
- **Stagger:** 6–10 frames entre elementos hermanos (6 para listas, 10 para bloques).
- **Salida:** 8 frames, solo opacidad.
- **Spring:** texto `{ damping: 200, stiffness: 120, mass: 1 }` (sin rebote); datos/barras `{ damping: 26, stiffness: 140 }` (rebote mínimo). Nunca `damping < 18`.
- **Drift de cámara:** escala 1.00→1.04 o traslación ≤24 px a lo largo de la escena completa, lineal.
- **Conteo de números:** 18–30 frames, ease-out.
- **Regla:** *cada animación debe explicar la narración* — entra cuando la voz lo nombra, resalta cuando la voz lo enfatiza. Nada se mueve “porque sí”.

## 6. Retícula de video 1080×1920

Zonas seguras (`tokens.videoFormat.safe`): top 160, bottom 380, left 72, right 160. Área segura útil: **848 × 1380 px** (x 72–920, y 160–1540). Columnas: 6 col de 128 px con gutter 16 dentro del área segura.

```
 0 ┌──────────────────────────────────────────┐
   │  top 160 — sin texto (UI de la app)      │
160├────┬────────────────────────────────┬────┤
   │ 72 │  EYEBROW mono 34               │160 │
   │    │  Headline serif 96             │ ←  │
   │    │                                │acc.│
   │    │  Zona de contenido / gráfico   │ de │
   │    │  848 × ~1000                   │plat│
   │    │                                │    │
1300   ├────────────────────────────────┤    │
   │    │  Banda de subtítulos y=1300–1540│   │
   │    │  caption sans 40, máx 2 líneas │    │
1540├────┴────────────────────────────────┴────┤
   │  bottom 380 — descripción/audio de la     │
   │  plataforma. Solo fondo.                  │
1920└──────────────────────────────────────────┘
```

Banda de subtítulos: y 1300–1540 (240 px), texto alineado a la izquierda en x 72, ancho máx. 848, sin caja o con caja `petrol-950/72` radio 10 padding 16×24. Firma de marca en outro: mono 34 dentro del área segura.

## 7. Pantallas de la app

Shell común: barra superior 56 px (logotipo textual serif, `BrandSwitcher`, botón Ajustes icon-ghost), contenido max-width 1280, gutter 32. Tono de copy: español de México, directo, sin hype, verbos en infinitivo para acciones (“Crear proyecto”), sustantivos para secciones.

### 7.1 Dashboard (`/`)
- `SectionHeader` h1: eyebrow “ESTUDIO · {marca}”, título “Proyectos”, acción `Button primary lg` “Crear proyecto” (icono plus).
- Fila de métricas (4 `Card`, grid 4 col): En producción · Revisión · Exportados este mes · Renders en cola. Número serif 40 + eyebrow.
- “Recientes”: grid 3 col de `Card interactive` (miniatura 9:16 a la izquierda 72×128 radio md, título serif 20, `StatusPill`, fecha mono). Proyecto demo con `Badge variant="demo"` “DEMO” arriba a la derecha + descripción “Proyecto de ejemplo, datos ficticios”.
- “En producción”: lista con `Progress` y `StatusPill` de render.
- “Videos completados”: tira horizontal de miniaturas.
- “Plantillas”: 3 tarjetas (technology-news, ai-tutorial, ai-explainer) filtradas por marca.
- Estados: carga → `Skeleton` con la misma geometría; vacío → `EmptyState` icono film, “Aún no hay proyectos”, “Empieza con una idea o abre el proyecto demo para ver el flujo completo.”, acciones Crear / Abrir demo; error → `Card` con borde danger, icono alert, “No pudimos leer los proyectos” + botón Reintentar.

### 7.2 Workspace de proyecto (`/projects/[id]`)
Tres columnas: izquierda 240 (stepper), centro fluido (min 560), derecha 400 (preview). <1280 la derecha pasa a un `Dialog` “Vista previa”.
- Stepper vertical: Investigación → Guion → Storyboard → Voz → Render. Cada paso: número mono, nombre, estado (check success / punto accent activo / slate pendiente). Línea hairline vertical que los une. `aria-current="step"`.
- Centro: `SectionHeader` del paso, contenido (formularios con `Field`, listas de fuentes, editor de guion `Textarea` con conteo mono), pie fijo con “Anterior” (ghost) y “Continuar” (primary).
- Derecha: Player Remotion 9:16 en contenedor radio xl, borde line, toggle “Mostrar zonas seguras”, timecode mono, `StatusPill` del último render, `Progress` durante render.

### 7.3 Biblioteca (`/library`)
`Tabs`: Ideas · Investigación · Fuentes · Guiones · Videos · Assets. Filtros arriba (Select de estado, Input búsqueda con icono). Vista lista (tabla hairline, filas 48 px) o tablero por estado (columnas por `ProjectStatus` con `StatusPill` en cabecera). Calendario mensual: grid 7 col, celdas 120 px alto, borde line, día en mono 12, eventos como chips de 20 px con punto de color de estado; hoy = borde accent.

### 7.4 Assets (`/assets`)
Secciones: Personaje (referencias frente / perfil / manos, tarjetas 3:4 con etiqueta mono), Logotipos (por marca, fondo raised), Música (lista: título, duración mono, `Badge` de licencia; nota obligatoria “Usa solo pistas con licencia verificada; registra la fuente.”). Subida: zona dashed + `Button secondary` “Subir archivo”.

### 7.5 Ajustes (`/settings`)
Lista de proveedores (LLM, voz, imagen) en `Card`: nombre, modelo (`Select`), estado `Badge success` “Configurado” / `Badge neutral` “No configurado”. **Nunca mostrar ni pedir valores de secretos.** Texto: “Las claves se leen de `.env.local`. Edita ese archivo y reinicia el servidor.” con la variable en `Kbd`/mono.

## 8. Componentes (`@/components/ui`)

| Componente | Props clave | Notas |
|---|---|---|
| `Button` | `variant` primary·secondary·outline·ghost·danger·link; `size` sm 32·md 40·lg 48·icon 36; `loading` | loading = spinner centrado, deshabilita, `aria-busy`. Disabled opacidad 45 %. Botón icon requiere `aria-label`. |
| `Card` + Header/Title/Description/Content/Footer | `interactive` | radio lg, hairline, sin sombra. |
| `Badge` | `variant` neutral·accent·gold·cyan·success·danger·outline·demo | mono 11 mayúsculas. `demo` = borde punteado dorado. |
| `StatusPill` | `status: ProjectStatus \| RenderStatus`, `size` sm·md | Etiquetas ES; bundling/rendering pulsan. `STATUS_META` exportado. |
| `Input`, `Textarea`, `Select` (nativo), `Label` | props nativas | `aria-invalid` → borde danger. |
| `Field` | `label`, `hint`, `error`, `required`, `children(ids)` | render-prop entrega `id`, `aria-describedby`, `aria-invalid`. |
| `Tabs` + `TabPanel` | `items`, `value`, `onValueChange`, `label`, `idBase` | Flechas/Home/End; subrayado accent 2 px. |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, `size` sm·md·lg | `<dialog>` nativo, Esc y clic en backdrop cierran. |
| `Progress` | `value` 0–1 (undefined = indeterminado), `tone`, `showValue`, `label` | barra 4 px. |
| `EmptyState` | `icon`, `title`, `description`, `action` | borde dashed, título serif. |
| `Skeleton`, `Separator`, `Kbd`, `Spinner` | — | — |
| `Tooltip` | `content`, `side` top·bottom | Solo CSS, hover (300 ms) y foco. No para info esencial. |
| `ToastProvider` / `useToast()` | `toast({title, description, tone, duration})`, `dismiss(id)` | máx. 4, abajo a la derecha, `aria-live`. |
| `SectionHeader` | `eyebrow`, `title`, `description`, `actions`, `as` h1·h2·h3 | h1 40 px, resto 28 px. |
| `BrandSwitcher` | `value: BrandId`, `onValueChange` | radiogroup, punto de acento por marca. |
| `Icon` | `name: IconName`, `size`, `label` | 25 iconos 2 px. |
