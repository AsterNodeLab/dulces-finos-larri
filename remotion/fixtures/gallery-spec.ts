/**
 * Fixture de QA visual: usa los 12 tipos de escena (~3 s cada uno).
 * Sin audio; los tiempos de palabra se ESTIMAN repartiendo cada narración de forma
 * uniforme dentro de su escena. Se valida con VideoSpecSchema al cargar el módulo.
 */
import { VideoSpecSchema, type VideoSpec, type WordTiming } from "../../src/shared/schema";

const FPS = 30;
const D = 90; // 3 s por escena

type RawScene = Record<string, unknown> & { narration: string; durationInFrames: number };

const scenes: RawScene[] = [
  { id: "hook", type: "AnimatedHook", durationInFrames: D, transition: "fade", camera: "push-in", narration: "¿Un agente de IA puede trabajar mientras duermes?", props: { kicker: "Agentes de IA", headline: "Tu próximo compañero de trabajo no duerme", highlight: "no duerme", visual: "pulse-grid" } },
  { id: "title", type: "EditorialTitle", durationInFrames: D, transition: "slide-up", camera: "drift", narration: "Hoy te explico qué es un agente, sin hype.", props: { eyebrow: "Explicador · 60 s", title: "Qué es un agente de IA", subtitle: "Un modelo que decide qué herramienta usar, la usa y revisa el resultado." } },
  { id: "presenter", type: "CrystalPresenter", durationInFrames: D, transition: "fade", camera: "static", narration: "Piensa en un asistente que no solo responde: actúa.", props: { line: "No solo responde: planea, usa herramientas y verifica.", pose: "point-left", side: "right" } },
  { id: "concept", type: "ConceptDiagram", durationInFrames: D, transition: "fade", camera: "drift", narration: "Tiene cuatro piezas: modelo, memoria, herramientas y objetivo.", props: { title: "Las piezas de un agente", center: "Agente", layout: "radial", nodes: [ { label: "Modelo", detail: "Razona el siguiente paso", icon: "brain" }, { label: "Memoria", detail: "Contexto y notas", icon: "database" }, { label: "Herramientas", detail: "APIs, búsqueda, código", icon: "tool" }, { label: "Objetivo", detail: "Qué cuenta como éxito", icon: "check" } ] } },
  { id: "compare", type: "AIModelComparison", durationInFrames: D, transition: "wipe", camera: "static", narration: "Comparemos tres formas de usar un modelo.", props: { title: "Chat, asistente o agente", columns: [ { name: "Chat", tag: "Responde" }, { name: "Asistente", tag: "Sugiere" }, { name: "Agente", tag: "Actúa" } ], rows: [ { label: "Usa herramientas", values: ["No", "A veces", "Sí"] }, { label: "Pasos", values: ["1", "Pocos", "Muchos"] }, { label: "Supervisión", values: ["Baja", "Media", "Alta"] } ], highlightColumn: 2, sourceNote: "Clasificación didáctica, no un benchmark" } },
  { id: "workflow", type: "AnimatedWorkflow", durationInFrames: D, transition: "fade", camera: "drift", narration: "Lee el correo, busca datos, redacta y agenda.", props: { title: "Un flujo real", loop: true, steps: [ { label: "Lee el correo", tool: "Gmail", icon: "mail" }, { label: "Busca el dato", tool: "Web", icon: "search" }, { label: "Redacta respuesta", tool: "LLM", icon: "chat" }, { label: "Agenda la cita", tool: "Calendar", icon: "calendar" } ] } },
  { id: "features", type: "FeatureExplainer", durationInFrames: D, transition: "slide-up", camera: "static", narration: "Tres reglas para usarlos con seguridad.", props: { title: "Úsalo con cabeza", features: [ { title: "Permisos mínimos", description: "Dale acceso solo a lo que necesita.", icon: "lock" }, { title: "Revisión humana", description: "Aprueba antes de enviar o pagar.", icon: "user" }, { title: "Registro de pasos", description: "Que puedas auditar qué hizo y por qué.", icon: "doc" } ] } },
  { id: "metric", type: "MetricCounter", durationInFrames: D, transition: "fade", camera: "push-in", narration: "Un dato de ejemplo: setenta y ocho por ciento.", props: { label: "Dato de ejemplo", value: 78, suffix: "%", decimals: 0, context: "de las tareas repetitivas del flujo se podrían delegar.", source: "Cifra ilustrativa para la demo" } },
  { id: "timeline", type: "TimelineScene", durationInFrames: D, transition: "fade", camera: "drift", narration: "Así llegamos aquí, en cuatro momentos.", props: { title: "Cómo llegamos aquí", events: [ { date: "2017", label: "Transformers" }, { date: "2022", label: "Chat masivo" }, { date: "2023", label: "Uso de herramientas" }, { date: "Hoy", label: "Agentes en producción" } ] } },
  { id: "quote", type: "QuoteCard", durationInFrames: D, transition: "fade", camera: "push-in", narration: "La idea clave: automatiza tareas, no criterio.", props: { quote: "Automatiza las tareas, no el criterio.", author: "Vision One", role: "Principio editorial", source: "Guía interna de la demo" } },
  { id: "sources", type: "SourceAttribution", durationInFrames: D, transition: "fade", camera: "static", narration: "Estas son las fuentes de este video.", props: { note: "Contenido de demostración: verifica las fuentes antes de publicar.", sources: [ { title: "Attention Is All You Need", publisher: "arXiv", date: "2017", url: "https://arxiv.org/abs/1706.03762" }, { title: "Building effective agents", publisher: "Anthropic", date: "2024", url: "https://www.anthropic.com/engineering/building-effective-agents" } ] } },
  { id: "outro", type: "BrandedOutro", durationInFrames: D, transition: "fade", camera: "static", narration: "Sígueme para más IA explicada.", props: { message: "IA explicada para usarla de verdad.", cta: "Sigue para más", handle: "@visionone" } },
];

/** Reparte las palabras de cada narración uniformemente dentro de su escena. */
function estimateWords(list: RawScene[], fps: number): WordTiming[] {
  const out: WordTiming[] = [];
  let offset = 0;
  for (const s of list) {
    const words = s.narration.split(/\s+/).filter(Boolean);
    const start = offset / fps + 0.2;
    const span = s.durationInFrames / fps - 0.5;
    const step = span / Math.max(1, words.length);
    words.forEach((w, i) => out.push({ text: w, start: +(start + i * step).toFixed(3), end: +(start + (i + 0.85) * step).toFixed(3) }));
    offset += s.durationInFrames;
  }
  return out;
}

export const gallerySpec: VideoSpec = VideoSpecSchema.parse({
  version: 1,
  brand: "vision-one",
  template: "ai-explainer",
  title: "Galería de escenas — QA visual",
  fps: FPS,
  width: 1080,
  height: 1920,
  scenes,
  captions: {
    enabled: true,
    position: "lower",
    keywords: ["agente", "herramientas", "seguridad", "fuentes"],
    maxCharsPerLine: 26,
    words: estimateWords(scenes, FPS),
  },
  demoWatermark: true,
});
