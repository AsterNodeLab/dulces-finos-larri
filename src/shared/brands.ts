/**
 * Perfiles de marca. Cada proyecto tiene un brandProfile (BrandId) que define identidad,
 * tono editorial, plantillas permitidas y recursos. Las marcas NO se mezclan automáticamente.
 */
import { palette } from "./tokens";

export const BRAND_IDS = ["vision-one", "visionquant"] as const;
export type BrandId = (typeof BRAND_IDS)[number];

export type TemplateId = "technology-news" | "ai-tutorial" | "ai-explainer";

export interface BrandProfile {
  id: BrandId;
  name: string;
  tagline: string;
  handle: string;
  /** Temas editoriales principales. */
  topics: string[];
  tone: {
    summary: string;
    do: string[];
    avoid: string[];
  };
  colors: {
    background: string;
    surface: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
    /** Acento primario de la marca. */
    accent: string;
    /** Acento secundario. */
    accent2: string;
    line: string;
  };
  /** Plantillas habilitadas para la marca. */
  templates: TemplateId[];
  /** Texto de la firma del outro. */
  signature: string;
}

export const BRANDS: Record<BrandId, BrandProfile> = {
  "vision-one": {
    id: "vision-one",
    name: "Vision One",
    tagline: "IA explicada para usarla de verdad",
    handle: "@visionone",
    topics: [
      "Lanzamientos de modelos de IA",
      "Tutoriales de ChatGPT, Claude y Gemini",
      "Agentes y automatización (n8n, APIs, MCP)",
      "Programación asistida (Claude Code, Codex, OpenCode)",
      "Comparativas y herramientas",
    ],
    tone: {
      summary:
        "Docente tecnológico que conoce el tema: claro, preciso, cercano, español de México. Explica el término técnico en vez de evitarlo.",
      do: [
        "Abrir con un problema o dato verificable",
        "Explicar por qué importa antes de cómo funciona",
        "Mostrar un ejemplo concreto y aplicable",
        "Cerrar con una conclusión útil",
      ],
      avoid: [
        "Hype vacío (“esto lo cambia todo”)",
        "Datos, fechas, precios o benchmarks sin fuente",
        "Jerga sin explicar",
        "CTA agresivos",
      ],
    },
    colors: {
      background: palette.petrol900,
      surface: palette.petrol800,
      surfaceRaised: palette.petrol700,
      text: palette.ivory100,
      textMuted: palette.slate300,
      accent: palette.cyan400,
      accent2: palette.gold400,
      line: "rgba(247,242,232,0.12)",
    },
    templates: ["technology-news", "ai-tutorial", "ai-explainer"],
    signature: "Vision One",
  },
  visionquant: {
    id: "visionquant",
    name: "VisionQuant",
    tagline: "Economía, mercados y tecnología con rigor",
    handle: "@visionquant",
    topics: [
      "Economía y mercados financieros",
      "IA, tecnología y empresas",
      "Bitcoin y criptomonedas",
      "Geopolítica",
      "Finanzas cuantitativas y tendencias estructurales",
    ],
    tone: {
      summary:
        "Analista profesional: probabilístico, sobrio, distingue hecho de estimación y de opinión. Nunca da recomendaciones de inversión.",
      do: [
        "Citar la fuente primaria del dato",
        "Separar hecho, estimación, inferencia y opinión",
        "Hablar en escenarios y rangos cuando hay incertidumbre",
        "Señalar riesgos y efectos de segundo orden",
      ],
      avoid: [
        "Predicciones con certeza",
        "Recomendaciones de compra/venta",
        "Gráficos sin escala o sin fuente",
        "Sensacionalismo",
      ],
    },
    colors: {
      background: palette.petrol950,
      surface: palette.petrol900,
      surfaceRaised: palette.petrol800,
      text: palette.ivory100,
      textMuted: palette.slate300,
      accent: palette.gold400,
      accent2: palette.cyan400,
      line: "rgba(216,189,128,0.16)",
    },
    templates: ["technology-news", "ai-explainer"],
    signature: "VisionQuant",
  },
};

export function getBrand(id: BrandId): BrandProfile {
  return BRANDS[id];
}
