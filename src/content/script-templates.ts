/**
 * Plantillas de guion por formato de contenido (ver docs/EDITORIAL_GUIDE.md §3).
 * Código puro: sin red, sin IA.
 */
import {
  SPANISH_WPS,
  type ContentFormat,
  type SceneType,
  type ScriptSegment,
  type ScriptSettings,
} from "@/shared/schema";
import type { BrandId } from "@/shared/brands";
import { SEGMENT_ROLES } from "@/shared/schema";

export type SegmentRole = (typeof SEGMENT_ROLES)[number];

export interface ScriptTemplateSegment {
  role: SegmentRole;
  guidance: string;
  /** Fracción del total de palabras; las de un formato suman 1. */
  share: number;
  visualHint: SceneType;
}

export interface ScriptTemplate {
  name: string;
  description: string;
  segments: ScriptTemplateSegment[];
}

export const SCRIPT_TEMPLATES: Record<ContentFormat, ScriptTemplate> = {
  launch: {
    name: "Lanzamiento",
    description: "Qué salió, qué cambia y para quién. Todo dato (fecha, precio, disponibilidad) debe venir de un claim verificado.",
    segments: [
      { role: "hook", share: 0.12, visualHint: "AnimatedHook", guidance: "Nombra el lanzamiento y la pregunta práctica que responde. Sin cifras no verificadas." },
      { role: "context", share: 0.18, visualHint: "TimelineScene", guidance: "Quién lo lanzó y qué problema existía antes. Fechas solo de claims." },
      { role: "explanation", share: 0.25, visualHint: "FeatureExplainer", guidance: "Qué hace, en lenguaje llano. Traduce cada término técnico." },
      { role: "demo", share: 0.2, visualHint: "AnimatedWorkflow", guidance: "Muestra un uso concreto paso a paso." },
      { role: "application", share: 0.15, visualHint: "CrystalPresenter", guidance: "Para quién sirve y en qué tarea real ahorra tiempo o dinero." },
      { role: "conclusion", share: 0.1, visualHint: "SourceAttribution", guidance: "Conclusión útil y mención de la fuente primaria." },
    ],
  },
  tutorial: {
    name: "Tutorial",
    description: "Cómo hacer algo en pocos pasos accionables (máximo 5, verbo + objeto).",
    segments: [
      { role: "hook", share: 0.1, visualHint: "AnimatedHook", guidance: "El resultado que el espectador obtendrá al final." },
      { role: "context", share: 0.1, visualHint: "CrystalPresenter", guidance: "Qué necesitas antes de empezar y por qué vale la pena." },
      { role: "demo", share: 0.45, visualHint: "AnimatedWorkflow", guidance: "Los pasos en orden; cada paso empieza con un verbo." },
      { role: "application", share: 0.2, visualHint: "FeatureExplainer", guidance: "Dónde aplicarlo en el trabajo diario o en un negocio." },
      { role: "conclusion", share: 0.08, visualHint: "CrystalPresenter", guidance: "Resume el resultado y el error más común a evitar." },
      { role: "cta", share: 0.07, visualHint: "BrandedOutro", guidance: "Una invitación breve conectada con el tema." },
    ],
  },
  concept: {
    name: "Concepto",
    description: "Qué es, cómo funciona y por qué importa.",
    segments: [
      { role: "hook", share: 0.12, visualHint: "AnimatedHook", guidance: "Una pregunta o problema real que el concepto resuelve." },
      { role: "explanation", share: 0.3, visualHint: "ConceptDiagram", guidance: "Definición en una frase llana y sus componentes." },
      { role: "demo", share: 0.25, visualHint: "AnimatedWorkflow", guidance: "Cómo funciona, mostrado como flujo visual." },
      { role: "application", share: 0.23, visualHint: "FeatureExplainer", guidance: "Un ejemplo concreto de uso en productividad o negocio." },
      { role: "conclusion", share: 0.1, visualHint: "BrandedOutro", guidance: "La idea que el espectador se lleva y un CTA breve." },
    ],
  },
  comparison: {
    name: "Comparativa",
    description: "A vs B con criterios declarados; sin ganador absoluto.",
    segments: [
      { role: "hook", share: 0.1, visualHint: "AnimatedHook", guidance: "La decisión que el espectador necesita tomar." },
      { role: "context", share: 0.12, visualHint: "EditorialTitle", guidance: "Qué se compara y con qué criterios." },
      { role: "explanation", share: 0.18, visualHint: "FeatureExplainer", guidance: "Qué es cada opción, en una frase cada una." },
      { role: "demo", share: 0.3, visualHint: "AIModelComparison", guidance: "Criterio por criterio; datos solo de claims con fuente." },
      { role: "application", share: 0.18, visualHint: "CrystalPresenter", guidance: "Cuándo conviene cada una según el caso de uso." },
      { role: "conclusion", share: 0.12, visualHint: "SourceAttribution", guidance: "Recomendación condicionada al caso y fuentes." },
    ],
  },
};

/** Palabras objetivo para una duración en segundos (≈2.5 palabras/s). */
export function wordBudget(targetDuration: number): number {
  return Math.round(targetDuration * SPANISH_WPS);
}

type OfflineClaim = { id: string; text: string; status: "verified" | "unverified" | "disputed" };

const clip = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…");
const firstSentence = (s: string) => (s.trim().match(/^[^.!?]+[.!?]?/)?.[0] ?? s).trim();

/**
 * Esqueleto de guion determinista, SIN IA. No inventa hechos: solo usa la idea,
 * el resumen y los textos de claims (verificados primero). Lo que requiere criterio
 * humano queda como "[Completa: …]".
 */
export function buildOfflineScript(input: {
  idea: string;
  brand: BrandId;
  settings: ScriptSettings;
  claims: OfflineClaim[];
  summary: string;
}): ScriptSegment[] {
  const template = SCRIPT_TEMPLATES[input.settings.format];
  const idea = input.idea.trim() || "[Completa: idea central del video]";
  const summary = input.summary.trim();
  const order = { verified: 0, unverified: 1, disputed: 2 } as const;
  const claims = [...input.claims].sort((a, b) => order[a.status] - order[b.status]);
  const queue = [...claims];
  const take = () => queue.shift();
  const factLine = (c: OfflineClaim) =>
    c.status === "verified"
      ? c.text.trim()
      : c.status === "disputed"
        ? `[Revisar: dato en disputa] ${c.text.trim()}`
        : `[No verificado] ${c.text.trim()}`;
  const handle = input.brand === "visionquant" ? "@visionquant" : "@visionone";

  return template.segments.map((seg, i) => {
    const used: OfflineClaim[] = [];
    let text: string;
    switch (seg.role) {
      case "hook":
        text = `${idea} [Completa: pregunta o problema concreto que abre el video]`;
        break;
      case "context": {
        const c = take();
        if (c) used.push(c);
        text = [summary ? firstSentence(summary) : "[Completa: contexto breve]", c ? factLine(c) : ""].filter(Boolean).join(" ");
        break;
      }
      case "explanation": {
        const parts: string[] = [];
        for (let k = 0; k < 2; k++) {
          const c = take();
          if (c) { used.push(c); parts.push(factLine(c)); }
        }
        if (parts.length === 0) parts.push(summary || "[Completa: definición en una frase llana]");
        text = `${parts.join(" ")} [Completa: traducción a lenguaje sencillo]`;
        break;
      }
      case "demo": {
        const c = take();
        if (c) used.push(c);
        text = [c ? factLine(c) : "", "[Completa: cómo funciona, paso a paso]"].filter(Boolean).join(" ");
        break;
      }
      case "application":
        text = "[Completa: ejemplo concreto] [Completa: conexión con productividad o negocio]";
        break;
      case "conclusion":
        text =
          input.settings.format === "concept"
            ? `[Completa: conclusión útil] Sígueme en ${handle} para seguir aprendiendo.`
            : "[Completa: conclusión útil]";
        break;
      case "cta":
      default:
        text = `Sígueme en ${handle} para más. [Completa: CTA conectado con el tema]`;
    }
    const segment: ScriptSegment = {
      id: `seg-${i + 1}`,
      role: seg.role,
      text: clip(text, 1200),
      visualHint: seg.visualHint,
      claimIds: used.map((c) => c.id),
    };
    if (seg.role === "hook") segment.onScreen = clip(idea, 140);
    return segment;
  });
}
