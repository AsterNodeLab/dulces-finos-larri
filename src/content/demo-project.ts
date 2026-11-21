/**
 * PROYECTO DEMO (contenido de demostración, NO publicar sin verificar).
 * "¿Qué es un agente de inteligencia artificial y por qué importa?" — Vision One, ai-explainer, 45 s, TikTok/Reels.
 */
import type { Research, Scene, Script, ScriptSegment } from "@/shared/schema";
import type { BrandId, TemplateId } from "@/shared/brands";

export const DEMO_PROJECT: { title: string; brand: BrandId; template: TemplateId; idea: string } = {
  title: "¿Qué es un agente de inteligencia artificial y por qué importa?",
  brand: "vision-one",
  template: "ai-explainer",
  idea:
    "DEMO. Video vertical de 45 s para TikTok/Reels (formato concepto): explicar qué es un agente de IA, en qué se diferencia de un chatbot o de un flujo fijo, cómo funciona su ciclo con herramientas y un ejemplo práctico de automatización con aprobación humana.",
};

export const DEMO_PLATFORMS = ["TikTok", "Reels"] as const;
export const DEMO_CAPTION_KEYWORDS = ["agente", "herramientas", "objetivo", "ciclo", "calendario", "automatizar", "criterio"];

const DEMO_NOTE = "Demo: verificar contra la fuente antes de publicar.";
const ACCESSED = "2026-11-21";

export const demoResearch: Research = {
  summary:
    "MATERIAL DE DEMOSTRACIÓN. Resumen conceptual basado en el artículo de Anthropic \"Building effective agents\": distingue entre flujos de trabajo (workflows), donde un modelo de lenguaje y sus herramientas siguen rutas de código predefinidas, y agentes, donde el modelo dirige dinámicamente su propio proceso y el uso de herramientas. Los claims están marcados como no verificados hasta contrastarlos con la fuente.",
  angles: [
    { title: "Qué es un agente de IA, explicado sin jerga", rationale: "Concepto muy mencionado y poco entendido; se puede explicar con un ciclo visual.", format: "concept" },
    { title: "Workflow vs agente: cuándo usar cada uno", rationale: "Ayuda a decidir cuánta autonomía dar a un sistema.", format: "comparison" },
    { title: "Tu primer agente: correo + calendario", rationale: "Aplicación práctica con aprobación humana.", format: "tutorial" },
  ],
  sources: [
    {
      id: "src-1",
      url: "https://www.anthropic.com/research/building-effective-agents",
      title: "Building effective agents",
      publisher: "Anthropic",
      publishedAt: "2024-12-19",
      accessedAt: ACCESSED,
      kind: "primary",
      excerpt: null,
    },
  ],
  claims: [
    {
      id: "claim-1",
      sourceId: "src-1",
      text: "Un agente es un sistema en el que un modelo de lenguaje dirige dinámicamente su propio proceso y el uso de herramientas, manteniendo el control de cómo cumple la tarea.",
      status: "unverified",
      note: DEMO_NOTE,
    },
    {
      id: "claim-2",
      sourceId: "src-1",
      text: "Los flujos de trabajo (workflows) orquestan modelos de lenguaje y herramientas mediante rutas de código predefinidas; los agentes deciden sus propios pasos.",
      status: "unverified",
      note: DEMO_NOTE,
    },
    {
      id: "claim-3",
      sourceId: "src-1",
      text: "En la práctica, un agente suele ser un modelo de lenguaje que usa herramientas en un ciclo, a partir de la retroalimentación que recibe de su entorno.",
      status: "unverified",
      note: DEMO_NOTE,
    },
  ],
  provider: "demo",
  isDemo: true,
  updatedAt: "2026-11-21T00:00:00.000Z",
};

const segments: ScriptSegment[] = [
  {
    id: "seg-1",
    role: "hook",
    text: "Un chatbot responde preguntas. Un agente de inteligencia artificial hace algo más: decide qué pasos dar para cumplir un objetivo.",
    onScreen: "¿Qué es un agente de IA?",
    visualHint: "AnimatedHook",
    claimIds: ["claim-1"],
  },
  {
    id: "seg-2",
    role: "explanation",
    text: "Dicho simple: es un modelo de lenguaje que usa herramientas en un ciclo. Tiene un objetivo, consulta herramientas como tu correo o calendario y recuerda lo que hizo.",
    onScreen: "Modelo + herramientas + memoria + objetivo",
    visualHint: "ConceptDiagram",
    claimIds: ["claim-3"],
  },
  {
    id: "seg-3",
    role: "demo",
    text: "Funciona así: percibe la tarea, razona el siguiente paso, usa una herramienta, observa el resultado y repite hasta poder responder.",
    onScreen: "El ciclo del agente",
    visualHint: "AnimatedWorkflow",
    claimIds: ["claim-2", "claim-3"],
  },
  {
    id: "seg-4",
    role: "application",
    text: "Imagina que un cliente te escribe para pedir una reunión. El agente revisa tu calendario, propone un horario libre y redacta la respuesta. Tú decides si se envía.",
    onScreen: "Correo → calendario → respuesta",
    visualHint: "AnimatedWorkflow",
    claimIds: [],
  },
  {
    id: "seg-5",
    role: "conclusion",
    text: "Un agente no reemplaza tu criterio: automatiza los pasos repetitivos. Sígueme para aprender a construir tu primer agente.",
    onScreen: "Automatiza pasos, conserva tu criterio",
    visualHint: "BrandedOutro",
    claimIds: [],
  },
];

export const demoScript: Script = {
  segments,
  settings: {
    targetDuration: 45,
    format: "concept",
    audience: "Profesionistas y emprendedores en México que quieren entender y usar IA, sin conocimientos técnicos previos",
    complexity: "basic",
    style: "teacher",
  },
  provider: "demo",
  approvedAt: "2026-11-21T00:00:00.000Z",
  version: 1,
  updatedAt: "2026-11-21T00:00:00.000Z",
};

const frames = (text: string) => Math.max(15, Math.round((text.trim().split(/\s+/).length / 2.5) * 30));

const seg4a = "Imagina que un cliente te escribe para pedir una reunión. El agente revisa tu calendario, propone un horario libre y redacta la respuesta.";
const seg4b = "Tú decides si se envía.";

export const demoScenes: Scene[] = [
  {
    id: "scene-1",
    type: "AnimatedHook",
    narration: segments[0].text,
    durationInFrames: frames(segments[0].text),
    transition: "none",
    camera: "push-in",
    lockedDuration: false,
    props: { kicker: "IA explicada", headline: "Un agente no solo responde: decide qué pasos dar", highlight: "decide qué pasos dar", visual: "question" },
  },
  {
    id: "scene-2",
    type: "ConceptDiagram",
    narration: segments[1].text,
    durationInFrames: frames(segments[1].text),
    transition: "fade",
    camera: "drift",
    lockedDuration: false,
    props: {
      title: "¿Qué tiene un agente?",
      center: "Agente de IA",
      layout: "radial",
      nodes: [
        { label: "Modelo de lenguaje", detail: "Razona y decide el siguiente paso", icon: "brain" },
        { label: "Herramientas", detail: "Correo, calendario, búsqueda", icon: "tool" },
        { label: "Memoria", detail: "Recuerda lo que ya hizo", icon: "database" },
        { label: "Objetivo", detail: "La tarea que debe cumplir", icon: "spark" },
      ],
    },
  },
  {
    id: "scene-3",
    type: "AnimatedWorkflow",
    narration: segments[2].text,
    durationInFrames: frames(segments[2].text),
    transition: "slide-up",
    camera: "static",
    lockedDuration: false,
    props: {
      title: "El ciclo del agente",
      loop: true,
      steps: [
        { label: "Percibir", icon: "search" },
        { label: "Razonar", icon: "brain" },
        { label: "Usar herramienta", icon: "tool" },
        { label: "Observar", icon: "chart" },
        { label: "Responder", icon: "chat" },
      ],
    },
  },
  {
    id: "scene-4",
    type: "AnimatedWorkflow",
    narration: seg4a,
    durationInFrames: frames(seg4a),
    transition: "wipe",
    camera: "drift",
    lockedDuration: false,
    props: {
      title: "Ejemplo: agendar una reunión",
      loop: false,
      steps: [
        { label: "Leer correo del cliente", tool: "Correo", icon: "mail" },
        { label: "Revisar disponibilidad", tool: "Calendario", icon: "calendar" },
        { label: "Proponer horario libre", icon: "check" },
        { label: "Redactar respuesta", icon: "doc" },
      ],
    },
  },
  {
    id: "scene-5",
    type: "CrystalPresenter",
    narration: seg4b,
    durationInFrames: frames(seg4b),
    transition: "fade",
    camera: "push-in",
    lockedDuration: false,
    props: { line: "Tú apruebas antes de enviar", pose: "point-left", side: "right" },
  },
  {
    id: "scene-6",
    type: "BrandedOutro",
    narration: segments[4].text,
    durationInFrames: frames(segments[4].text),
    transition: "fade",
    camera: "static",
    lockedDuration: false,
    props: { message: "Un agente automatiza pasos repetitivos; el criterio sigue siendo tuyo.", cta: "Sígueme para aprender a construir tu primer agente", handle: "@visionone" },
  },
];

export function demoNarrationText(): string {
  return demoScript.segments.map((s) => s.text).join(" ");
}
