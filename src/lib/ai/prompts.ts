/**
 * Constructores de prompts (funciones puras, sin red).
 * Todos exigen respuesta SOLO en JSON con la forma indicada; el código valida con Zod después.
 */
import { BRANDS, type BrandId, type TemplateId } from "@/shared/brands";
import { TEMPLATES } from "@/shared/templates";
import { ICON_NAMES, type ScriptSegment, type ScriptSettings } from "@/shared/schema";

export type Prompt = { system: string; user: string };

type PromptClaim = { id: string; text: string; status: "verified" | "unverified" | "disputed" };

const JSON_ONLY =
  "Responde ÚNICAMENTE con un objeto JSON válido con la forma indicada. Sin texto antes ni después, sin bloques de código markdown, sin comentarios.";

function brandBlock(brand: BrandId): string {
  const b = BRANDS[brand];
  return [
    `MARCA: ${b.name} (${b.id}) — ${b.tagline}. Handle: ${b.handle}.`,
    `Tono: ${b.tone.summary}`,
    `Haz: ${b.tone.do.join("; ")}.`,
    `Evita: ${b.tone.avoid.join("; ")}.`,
    `Trabaja solo para esta marca. No mezcles tono, handle, CTA ni recursos de otra marca.`,
  ].join("\n");
}

const EDITORIAL_RULES = [
  "Español de México natural, claro y preciso. Explica el término técnico en lugar de evitarlo. Sin hype ni grandilocuencia.",
  "Separa HECHOS → EXPLICACIÓN → EJEMPLO → APLICACIÓN → CONCLUSIÓN.",
  "Nunca inventes fechas, precios, benchmarks, cifras ni funciones de productos o modelos.",
  "Los hooks deben ser honestos: prometen exactamente lo que el video entrega.",
].join("\n");

const claimsBlock = (claims: PromptClaim[]) =>
  claims.length
    ? claims.map((c) => `- [${c.id}] (${c.status}) ${c.text}`).join("\n")
    : "(sin claims registrados: no afirmes ningún dato verificable)";

const settingsBlock = (s: ScriptSettings) =>
  `Duración objetivo: ${s.targetDuration} s (≈${Math.round(s.targetDuration * 2.5)} palabras). Formato: ${s.format}. Audiencia: ${s.audience || "general"}. Complejidad: ${s.complexity}. Estilo narrativo: ${s.style}.`;

const SEGMENT_SHAPE =
  '{ "id": string, "role": "hook"|"context"|"explanation"|"demo"|"application"|"conclusion"|"cta", "text": string (narración, ≤1200 caracteres), "onScreen"?: string (≤140), "visualHint"?: SceneType, "claimIds": string[] }';

/* ───────────────────────────── Investigación ───────────────────────────── */

export function buildResearchPrompt(i: {
  brand: BrandId;
  idea: string;
  today: string;
  sources: {
    id: string;
    title: string;
    url: string | null;
    publisher: string | null;
    publishedAt: string | null;
    kind: "primary" | "secondary";
    excerpt: string;
  }[];
}): Prompt {
  const system = [
    "Eres el investigador editorial de VisionQuant Studio. Extraes afirmaciones verificables de fuentes proporcionadas y propones ángulos educativos.",
    brandBlock(i.brand),
    EDITORIAL_RULES,
    "REGLAS DE CLAIMS:",
    "- Cada claim debe salir de un extracto proporcionado; indica su sourceId. No agregues conocimiento externo como hecho.",
    '- "verified" solo si una fuente de tipo primary lo afirma explícitamente en su extracto.',
    '- Si solo lo dice una fuente secondary o es una inferencia, usa "unverified" y explica en note.',
    '- Si dos fuentes se contradicen, marca "disputed" y describe el conflicto en note.',
    "- Copia fechas, cifras y nombres tal como aparecen en el extracto; no los redondees ni completes.",
    '- Si sugieres algo sin fuente (p. ej. contexto general), sourceId=null, status="unverified".',
    "- summary: 2–5 frases neutrales basadas solo en las fuentes; indica vacíos de información.",
    '- angles: 2–4 ángulos; format ∈ "launch"|"tutorial"|"concept"|"comparison".',
    JSON_ONLY,
    'Forma: { "summary": string, "angles": [{ "title": string (≤120), "rationale": string (≤400), "format": string }], "claims": [{ "sourceId": string|null, "text": string (≤600), "status": "verified"|"unverified"|"disputed", "note": string|null }] }',
  ].join("\n\n");
  const sources = i.sources.length
    ? i.sources
        .map(
          (s) =>
            `### Fuente ${s.id} (${s.kind})\nTítulo: ${s.title}\nEditor: ${s.publisher ?? "desconocido"}\nURL: ${s.url ?? "n/d"}\nPublicada: ${s.publishedAt ?? "fecha desconocida"}\nExtracto:\n${s.excerpt}`,
        )
        .join("\n\n")
    : "(No hay fuentes. Todos los claims deben ser unverified con sourceId null, y el summary debe decir que falta investigación.)";
  const user = `Fecha de hoy: ${i.today}\nIdea del video: ${i.idea}\n\nFUENTES:\n${sources}`;
  return { system, user };
}

/* ──────────────────────────────── Guion ──────────────────────────────── */

export function buildScriptPrompt(i: {
  brand: BrandId;
  idea: string;
  summary: string;
  claims: PromptClaim[];
  settings: ScriptSettings;
  template: TemplateId;
  segmentPlan: { role: string; guidance: string; words: number }[];
}): Prompt {
  const tpl = TEMPLATES[i.template];
  const system = [
    "Eres el guionista educativo de VisionQuant Studio. Escribes narración para videos verticales (TikTok/Reels/Shorts) que se escucha en voz alta.",
    brandBlock(i.brand),
    EDITORIAL_RULES,
    "MÉTODO: problema → por qué importa → traducción simple → cómo funciona (visual) → aplicación → cómo usarlo → conexión con productividad/negocio → conclusión útil.",
    "REGLAS:",
    "- Los hechos solo pueden venir de los claims listados; referencia sus ids en claimIds.",
    '- Un claim "unverified" solo puede usarse atribuido ("según…", "se reporta que…"); uno "disputed" no se presenta como hecho.',
    "- Los ejemplos hipotéticos se presentan como tales (\"imagina que…\").",
    "- Sigue el plan de segmentos en orden y con esos roles. Respeta el presupuesto de palabras (±15 %); desvíate solo si la narración natural lo exige.",
    '- ids: "seg-1", "seg-2", … en orden.',
    "- Frases cortas, para decirse en voz alta. Nada de emojis ni hashtags en la narración.",
    `- visualHint: uno de AnimatedHook, EditorialTitle, CrystalPresenter, ConceptDiagram, AIModelComparison, AnimatedWorkflow, FeatureExplainer, MetricCounter, TimelineScene, QuoteCard, SourceAttribution, BrandedOutro.`,
    JSON_ONLY,
    `Forma: { "segments": [ ${SEGMENT_SHAPE} ] }`,
  ].join("\n\n");
  const plan = i.segmentPlan.map((p, k) => `${k + 1}. ${p.role} (~${p.words} palabras): ${p.guidance}`).join("\n");
  const user = [
    `Idea: ${i.idea}`,
    `Plantilla: ${tpl.name} — ${tpl.description}`,
    settingsBlock(i.settings),
    `Resumen de investigación:\n${i.summary || "(sin resumen)"}`,
    `Claims disponibles:\n${claimsBlock(i.claims)}`,
    `Plan de segmentos:\n${plan}`,
  ].join("\n\n");
  return { system, user };
}

export function buildSegmentRegenPrompt(i: {
  brand: BrandId;
  segments: ScriptSegment[];
  segmentId: string;
  instruction: string;
  claims: PromptClaim[];
  settings: ScriptSettings;
}): Prompt {
  const target = i.segments.find((s) => s.id === i.segmentId);
  const system = [
    "Eres el guionista educativo de VisionQuant Studio. Reescribes UN segmento de un guion existente sin romper la continuidad con los demás.",
    brandBlock(i.brand),
    EDITORIAL_RULES,
    "REGLAS:",
    `- Conserva exactamente el id "${i.segmentId}" y el role "${target?.role ?? "(el mismo)"}".`,
    "- Aplica la instrucción del usuario sin contradecir los claims ni introducir datos nuevos.",
    "- Mantén una longitud similar salvo que la instrucción pida otra cosa.",
    "- claimIds: solo ids de la lista de claims.",
    JSON_ONLY,
    `Forma: { "segment": ${SEGMENT_SHAPE} }`,
  ].join("\n\n");
  const script = i.segments
    .map((s) => `${s.id === i.segmentId ? ">>> " : ""}[${s.id} · ${s.role}] ${s.text}`)
    .join("\n");
  const user = [
    settingsBlock(i.settings),
    `Guion completo (el segmento a reescribir está marcado con >>>):\n${script}`,
    `Claims disponibles:\n${claimsBlock(i.claims)}`,
    `Instrucción: ${i.instruction}`,
  ].join("\n\n");
  return { system, user };
}

/* ─────────────────────────── Motion Director ─────────────────────────── */

export const SCENE_CATALOG = [
  "Límites en caracteres. '?' = opcional. Íconos permitidos: " + ICON_NAMES.join(", ") + ".",
  "1. AnimatedHook { kicker?≤40, headline≤90, highlight?≤40 (frase contenida en headline), visual: \"pulse-grid\"|\"orbit\"|\"question\" } — apertura.",
  "2. EditorialTitle { eyebrow?≤40, title≤80, subtitle?≤140 } — portada de sección o contexto.",
  "3. CrystalPresenter { line≤110, pose: \"idle\"|\"point-left\"|\"point-right\"|\"explain\", side: \"left\"|\"right\", referenceImage?≤300 } — presentador con frase clave.",
  "4. ConceptDiagram { title≤70, center≤28, nodes: 2–6 × { label≤28, detail?≤60, icon? }, layout: \"radial\"|\"stack\" } — concepto y sus componentes.",
  "5. AIModelComparison { title≤70, columns: 2–3 × { name≤22, tag?≤22 }, rows: 1–5 × { label≤26, values: 2–3 strings ≤40 (uno por columna) }, highlightColumn?: 0–2, sourceNote?≤120 } — comparativa; datos solo de claims.",
  "6. AnimatedWorkflow { title≤70, steps: 2–6 × { label≤30, tool?≤24, icon? }, loop: boolean } — proceso o ciclo.",
  "7. FeatureExplainer { title≤70, features: 1–4 × { title≤36, description≤110, icon? } } — capacidades o beneficios.",
  "8. MetricCounter { label≤60, value: number, prefix?≤6, suffix?≤10, decimals: 0–3, context?≤120, source?≤120 } — una cifra; SOLO de un claim y con source.",
  "9. TimelineScene { title≤70, events: 2–6 × { date≤20, label≤60 } } — cronología; fechas solo de claims.",
  "10. QuoteCard { quote≤220, author≤50, role?≤60, source?≤120 } — cita textual real de una fuente.",
  "11. SourceAttribution { sources: 1–4 × { title≤90, publisher≤50, url?≤300, date?≤30 }, note?≤140 } — fuentes del video.",
  "12. BrandedOutro { message≤100, cta?≤60, handle?≤40 } — cierre de marca.",
].join("\n");

export function buildMotionDirectorPrompt(i: {
  brand: BrandId;
  template: TemplateId;
  segments: ScriptSegment[];
  sceneCatalog: string;
}): Prompt {
  const tpl = TEMPLATES[i.template];
  const roleMap = Object.entries(tpl.roleToScene).map(([r, s]) => `${r}→${s}`).join(", ");
  const system = [
    "Eres el Motion Director de VisionQuant Studio. Conviertes un guion aprobado en un storyboard de escenas para Remotion (1080x1920). No escribes código: solo datos.",
    brandBlock(i.brand),
    "REGLAS:",
    "- Una o más escenas por segmento, en el mismo orden del guion. Cada escena indica segmentId.",
    "- Usa solo los tipos del catálogo y respeta estrictamente sus props y límites de caracteres; si el texto no cabe, divide en dos escenas o resume.",
    "- Lo visual debe ilustrar lo que dice la narración del segmento; no agregues ideas ni datos que no estén en el guion.",
    "- MetricCounter, TimelineScene y AIModelComparison solo con números/fechas que aparezcan en el guion respaldados por claims; MetricCounter siempre con source. Si no hay dato, usa otro tipo de escena.",
    "- El texto en pantalla es breve y en español de México.",
    `- Mapeo sugerido de la plantilla ${tpl.name}: ${roleMap}. Preferidas: ${tpl.preferred.join(", ")}.`,
    '- transition ∈ "none"|"fade"|"slide-up"|"wipe"; camera ∈ "static"|"push-in"|"drift". Varía con moderación.',
    `- El cierre usa BrandedOutro con handle ${BRANDS[i.brand].handle}.`,
    JSON_ONLY,
    'Forma: { "scenes": [{ "segmentId": string, "type": SceneType, "props": object, "transition": string, "camera": string }] }',
  ].join("\n\n");
  const user = [
    `CATÁLOGO DE ESCENAS:\n${i.sceneCatalog}`,
    `GUION:\n${i.segments
      .map((s) => `[${s.id} · ${s.role}${s.visualHint ? ` · sugerencia ${s.visualHint}` : ""}] ${s.text}${s.onScreen ? `\n  En pantalla: ${s.onScreen}` : ""}`)
      .join("\n")}`,
  ].join("\n\n");
  return { system, user };
}
