/**
 * Tokens de diseño base de VisionQuant Studio.
 * Fuente única de verdad compartida por la app (Next.js) y el motor de video (Remotion).
 * Código puro: sin dependencias de Node ni del DOM.
 * Ver docs/DESIGN_SYSTEM.md para el razonamiento de cada valor.
 */

export const palette = {
  petrol950: "#040B14",
  petrol900: "#071320", // Azul petróleo (fondo principal)
  petrol800: "#0C1D2E",
  petrol700: "#13293F",
  navy600: "#1C3754",
  navy500: "#2A4A6B",
  slate400: "#6F8399",
  slate300: "#9AABBD",
  ivory50: "#FBF8F2",
  ivory100: "#F7F2E8", // Marfil (texto principal sobre oscuro)
  ivory200: "#EDE5D6",
  gold400: "#D8BD80", // Dorado discreto (acento editorial)
  gold500: "#C4A464",
  cyan400: "#4BD9E8", // Cian (acento tecnológico / datos)
  cyan500: "#2BBFCF",
  charcoal: "#0E1114",
  danger: "#E8735A",
  success: "#7FD1A8",
} as const;

export const fonts = {
  /** Display editorial (titulares). */
  serif: "'Fraunces Variable', 'Fraunces', Georgia, 'Times New Roman', serif",
  /** Texto de interfaz y subtítulos. */
  sans: "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Datos, código, etiquetas técnicas. */
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace",
} as const;

/** Escala de espaciado en px (base 4). */
export const space = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

/** Formato de video vertical. */
export const videoFormat = {
  width: 1080,
  height: 1920,
  defaultFps: 30,
  /**
   * Zonas seguras para TikTok / Reels (px sobre 1080x1920).
   * La UI de las plataformas cubre la parte inferior (descripción, audio) y la columna derecha (acciones).
   * Estimación conservadora; ver docs/DESIGN_SYSTEM.md.
   */
  safe: { top: 160, bottom: 380, left: 72, right: 160 },
} as const;
