import type { SceneType } from "@/shared/schema";

export const ROLE_LABEL: Record<string, string> = {
  hook: "Gancho",
  context: "Contexto",
  explanation: "Explicación",
  demo: "Demostración",
  application: "Aplicación",
  conclusion: "Conclusión",
  cta: "Llamada a la acción",
};

export const SCENE_LABEL: Record<SceneType, string> = {
  AnimatedHook: "Gancho animado",
  EditorialTitle: "Título editorial",
  CrystalPresenter: "Presentador",
  ConceptDiagram: "Diagrama de concepto",
  AIModelComparison: "Comparación de modelos",
  AnimatedWorkflow: "Flujo animado",
  FeatureExplainer: "Explicación de funciones",
  MetricCounter: "Cifra clave",
  TimelineScene: "Línea de tiempo",
  QuoteCard: "Cita",
  SourceAttribution: "Fuentes",
  BrandedOutro: "Cierre de marca",
};

export const COMPLEXITY_LABEL: Record<string, string> = { basic: "Básica", intermediate: "Intermedia", advanced: "Avanzada" };
export const STYLE_LABEL: Record<string, string> = { teacher: "Docente", analyst: "Analista", storyteller: "Narrativo", direct: "Directo" };
export const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", "youtube-shorts": "YouTube Shorts", other: "Otra" };
export const CLAIM_STATUS_LABEL: Record<string, string> = { verified: "Verificada", unverified: "No verificada", disputed: "En disputa" };
export const SOURCE_KIND_LABEL: Record<string, string> = { primary: "Primaria", secondary: "Secundaria" };
export const TRANSITION_LABEL: Record<string, string> = { none: "Ninguna", fade: "Fundido", "slide-up": "Deslizar arriba", wipe: "Cortinilla" };
export const CAMERA_LABEL: Record<string, string> = { static: "Estática", "push-in": "Acercamiento", drift: "Deriva suave" };
export const ASSET_KIND_LABEL: Record<string, string> = {
  "character-front": "Personaje · frente",
  "character-side": "Personaje · perfil",
  "character-hands": "Personaje · manos",
  logo: "Logotipo",
  image: "Imagen",
  music: "Música",
};
export const QUALITY_LABEL: Record<string, string> = { preview: "Previsualización rápida", final: "Render final 1080×1920" };

export function providerLabel(provider: string): { label: string; tone: "neutral" | "accent" | "success" | "danger" | "gold"; unverified: boolean } {
  const base = provider.replace("+edit", "");
  const edited = provider.endsWith("+edit");
  const sfx = edited ? " · editado" : "";
  if (base === "offline") return { label: `Análisis offline${sfx}`, tone: "gold", unverified: true };
  if (base === "demo") return { label: `Demo${sfx}`, tone: "gold", unverified: false };
  if (base === "manual") return { label: "Manual", tone: "neutral", unverified: false };
  if (base === "anthropic") return { label: `IA · Claude${sfx}`, tone: "accent", unverified: false };
  if (base === "openai") return { label: `IA · OpenAI${sfx}`, tone: "accent", unverified: false };
  return { label: provider, tone: "neutral", unverified: false };
}
