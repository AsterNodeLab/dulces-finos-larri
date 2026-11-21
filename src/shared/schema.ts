/**
 * CONTRATO CENTRAL de VisionQuant Studio.
 *
 * Todo lo que cruza fronteras (UI ↔ API ↔ IA ↔ Remotion ↔ worker de render) se valida aquí con Zod.
 * - El "Motion Director" (IA) solo puede producir un VideoSpec que pase este schema.
 * - Remotion solo renderiza VideoSpec validados: nunca código generado por un modelo.
 *
 * Código puro (sin Node/DOM) para poder importarse desde Remotion y desde el navegador.
 */
import { z } from "zod";
import { BRAND_IDS } from "./brands";

/* ────────────────────────────── Básicos ────────────────────────────── */

export const BrandIdSchema = z.enum(BRAND_IDS);

export const TEMPLATE_IDS = ["technology-news", "ai-tutorial", "ai-explainer"] as const;
export const TemplateIdSchema = z.enum(TEMPLATE_IDS);

export const PROJECT_STATUSES = ["idea", "research", "script", "production", "review", "approved", "exported"] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const CONTENT_FORMATS = ["launch", "tutorial", "concept", "comparison"] as const;
export const ContentFormatSchema = z.enum(CONTENT_FORMATS);
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const TARGET_DURATIONS = [15, 30, 45, 60, 90] as const;
export const TargetDurationSchema = z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.literal(90)]);

export const COMPLEXITY_LEVELS = ["basic", "intermediate", "advanced"] as const;
export const ComplexitySchema = z.enum(COMPLEXITY_LEVELS);

export const NARRATIVE_STYLES = ["teacher", "analyst", "storyteller", "direct"] as const;
export const NarrativeStyleSchema = z.enum(NARRATIVE_STYLES);

/** Íconos SVG disponibles en el motor (remotion/primitives/Icon.tsx). */
export const ICON_NAMES = [
  "brain", "tool", "search", "mail", "calendar", "database", "code", "chat",
  "spark", "check", "doc", "globe", "bolt", "chart", "user", "gear", "lock", "play",
] as const;
export const IconNameSchema = z.enum(ICON_NAMES);
export type IconName = z.infer<typeof IconNameSchema>;

const shortText = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).optional();

/* ────────────────────────── Props por escena ───────────────────────── */
/* Límites de longitud = legibilidad en 1080x1920. Si no cabe, se divide la escena. */

export const AnimatedHookProps = z.object({
  kicker: optText(40),
  headline: shortText(90),
  /** Palabra o frase del headline a resaltar con el acento. */
  highlight: optText(40),
  visual: z.enum(["pulse-grid", "orbit", "question"]).default("pulse-grid"),
});

export const EditorialTitleProps = z.object({
  eyebrow: optText(40),
  title: shortText(80),
  subtitle: optText(140),
});

export const CrystalPresenterProps = z.object({
  /** Texto corto en pantalla junto al presentador. */
  line: shortText(110),
  pose: z.enum(["idle", "point-left", "point-right", "explain"]).default("explain"),
  side: z.enum(["left", "right"]).default("right"),
  /** Ruta de un asset del personaje (biblioteca de marca). Si falta: avatar provisional. */
  referenceImage: z.string().max(300).optional(),
});

export const ConceptDiagramProps = z.object({
  title: shortText(70),
  center: shortText(28),
  nodes: z.array(z.object({ label: shortText(28), detail: optText(60), icon: IconNameSchema.optional() })).min(2).max(6),
  layout: z.enum(["radial", "stack"]).default("radial"),
});

export const AIModelComparisonProps = z.object({
  title: shortText(70),
  columns: z.array(z.object({ name: shortText(22), tag: optText(22) })).min(2).max(3),
  rows: z.array(z.object({ label: shortText(26), values: z.array(z.string().trim().max(40)).min(2).max(3) })).min(1).max(5),
  highlightColumn: z.number().int().min(0).max(2).optional(),
  sourceNote: optText(120),
});

export const AnimatedWorkflowProps = z.object({
  title: shortText(70),
  steps: z.array(z.object({ label: shortText(30), tool: optText(24), icon: IconNameSchema.optional() })).min(2).max(6),
  loop: z.boolean().default(false),
});

export const FeatureExplainerProps = z.object({
  title: shortText(70),
  features: z.array(z.object({ title: shortText(36), description: z.string().trim().max(110), icon: IconNameSchema.optional() })).min(1).max(4),
});

export const MetricCounterProps = z.object({
  label: shortText(60),
  value: z.number().finite(),
  prefix: optText(6),
  suffix: optText(10),
  decimals: z.number().int().min(0).max(3).default(0),
  context: optText(120),
  /** Fuente del dato. Obligatoria fuera del modo demo (lo valida el QA de storyboard). */
  source: optText(120),
});

export const TimelineSceneProps = z.object({
  title: shortText(70),
  events: z.array(z.object({ date: shortText(20), label: shortText(60) })).min(2).max(6),
});

export const QuoteCardProps = z.object({
  quote: shortText(220),
  author: shortText(50),
  role: optText(60),
  source: optText(120),
});

export const SourceAttributionProps = z.object({
  sources: z.array(z.object({ title: shortText(90), publisher: shortText(50), url: z.string().max(300).optional(), date: optText(30) })).min(1).max(4),
  note: optText(140),
});

export const BrandedOutroProps = z.object({
  message: shortText(100),
  cta: optText(60),
  handle: optText(40),
});

export const SCENE_TYPES = [
  "AnimatedHook", "EditorialTitle", "CrystalPresenter", "ConceptDiagram", "AIModelComparison", "AnimatedWorkflow",
  "FeatureExplainer", "MetricCounter", "TimelineScene", "QuoteCard", "SourceAttribution", "BrandedOutro",
] as const;
export const SceneTypeSchema = z.enum(SCENE_TYPES);
export type SceneType = z.infer<typeof SceneTypeSchema>;

export const TransitionSchema = z.enum(["none", "fade", "slide-up", "wipe"]);
export const CameraSchema = z.enum(["static", "push-in", "drift"]);

const sceneBase = {
  id: z.string().min(1).max(40),
  /** Texto de narración que cubre esta escena (para sincronía y edición). */
  narration: z.string().max(1200).default(""),
  /** Duración en frames. La calcula el sincronizador cuando hay audio; editable a mano. */
  durationInFrames: z.number().int().min(15).max(60 * 60),
  /** Transición de ENTRADA a esta escena. */
  transition: TransitionSchema.default("fade"),
  camera: CameraSchema.default("drift"),
  /** Si true, la duración fue fijada a mano y el sincronizador no la sobrescribe. */
  lockedDuration: z.boolean().default(false),
};

export const SceneSchema = z.discriminatedUnion("type", [
  z.object({ ...sceneBase, type: z.literal("AnimatedHook"), props: AnimatedHookProps }),
  z.object({ ...sceneBase, type: z.literal("EditorialTitle"), props: EditorialTitleProps }),
  z.object({ ...sceneBase, type: z.literal("CrystalPresenter"), props: CrystalPresenterProps }),
  z.object({ ...sceneBase, type: z.literal("ConceptDiagram"), props: ConceptDiagramProps }),
  z.object({ ...sceneBase, type: z.literal("AIModelComparison"), props: AIModelComparisonProps }),
  z.object({ ...sceneBase, type: z.literal("AnimatedWorkflow"), props: AnimatedWorkflowProps }),
  z.object({ ...sceneBase, type: z.literal("FeatureExplainer"), props: FeatureExplainerProps }),
  z.object({ ...sceneBase, type: z.literal("MetricCounter"), props: MetricCounterProps }),
  z.object({ ...sceneBase, type: z.literal("TimelineScene"), props: TimelineSceneProps }),
  z.object({ ...sceneBase, type: z.literal("QuoteCard"), props: QuoteCardProps }),
  z.object({ ...sceneBase, type: z.literal("SourceAttribution"), props: SourceAttributionProps }),
  z.object({ ...sceneBase, type: z.literal("BrandedOutro"), props: BrandedOutroProps }),
]);
export type Scene = z.infer<typeof SceneSchema>;
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;
export type ScenePropsOf<T extends SceneType> = SceneOf<T>["props"];

/* ───────────────────────────── Subtítulos ──────────────────────────── */

export const WordTimingSchema = z.object({
  text: z.string().min(1).max(60),
  /** Segundos desde el inicio del audio. */
  start: z.number().min(0),
  end: z.number().min(0),
});
export type WordTiming = z.infer<typeof WordTimingSchema>;

export const CaptionSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  /** lower = sobre la zona segura inferior; middle = tercio medio. */
  position: z.enum(["lower", "middle"]).default("lower"),
  /** Palabras clave a resaltar (comparación sin acentos, minúsculas). */
  keywords: z.array(z.string().max(40)).max(40).default([]),
  /** Máximo de caracteres por línea; máximo 2 líneas visibles. */
  maxCharsPerLine: z.number().int().min(14).max(36).default(26),
  words: z.array(WordTimingSchema).max(5000).default([]),
});
export type CaptionSettings = z.infer<typeof CaptionSettingsSchema>;

/* ───────────────────────────── VideoSpec ───────────────────────────── */

export const VideoSpecSchema = z.object({
  version: z.literal(1),
  brand: BrandIdSchema,
  template: TemplateIdSchema,
  title: z.string().max(140),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
  width: z.number().int().default(1080),
  height: z.number().int().default(1920),
  scenes: z.array(SceneSchema).min(1).max(40),
  /** Narración definitiva. src es una ruta relativa dentro de data/media (p. ej. "projects/<id>/narration.wav"). */
  audio: z
    .object({ src: z.string().max(300), durationInSeconds: z.number().positive(), volume: z.number().min(0).max(1).default(1) })
    .optional(),
  /** Música opcional: solo archivos aportados por el usuario con licencia adecuada. */
  music: z.object({ src: z.string().max(300), volume: z.number().min(0).max(1).default(0.12) }).optional(),
  captions: CaptionSettingsSchema,
  /** Marca de demo visible en el video (esquina) cuando el contenido es de demostración. */
  demoWatermark: z.boolean().default(false),
});
export type VideoSpec = z.infer<typeof VideoSpecSchema>;

/**
 * Props que recibe la composición de Remotion.
 * assetBaseUrl: en el Player = "/api/media/"; en render = null → se usa staticFile() sobre data/media.
 */
export const CompositionPropsSchema = z.object({
  spec: VideoSpecSchema,
  assetBaseUrl: z.string().nullable().default(null),
});
export type CompositionProps = z.infer<typeof CompositionPropsSchema>;

export function totalDurationInFrames(spec: Pick<VideoSpec, "scenes">): number {
  return spec.scenes.reduce((acc, s) => acc + s.durationInFrames, 0);
}

/* ─────────────────────────── Investigación ─────────────────────────── */

export const SourceKindSchema = z.enum(["primary", "secondary"]);
export const ClaimStatusSchema = z.enum(["verified", "unverified", "disputed"]);

export const SourceSchema = z.object({
  id: z.string(),
  url: z.string().max(2000).nullable(),
  title: z.string().max(300),
  publisher: z.string().max(120).nullable(),
  /** Fecha de publicación tal como la declara la fuente (ISO) o null si no se pudo determinar. */
  publishedAt: z.string().nullable(),
  accessedAt: z.string(),
  kind: SourceKindSchema,
  excerpt: z.string().max(20000).nullable(),
});
export type Source = z.infer<typeof SourceSchema>;

export const ClaimSchema = z.object({
  id: z.string(),
  sourceId: z.string().nullable(),
  text: z.string().min(1).max(600),
  status: ClaimStatusSchema,
  note: z.string().max(400).nullable(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const ResearchSchema = z.object({
  summary: z.string().max(4000),
  angles: z.array(z.object({ title: z.string().max(120), rationale: z.string().max(400), format: ContentFormatSchema })).max(6),
  sources: z.array(SourceSchema),
  claims: z.array(ClaimSchema),
  /** Quién produjo la investigación: anthropic | openai | offline | demo | manual */
  provider: z.string(),
  isDemo: z.boolean(),
  updatedAt: z.string(),
});
export type Research = z.infer<typeof ResearchSchema>;

/* ─────────────────────────────── Guion ─────────────────────────────── */

export const SEGMENT_ROLES = ["hook", "context", "explanation", "demo", "application", "conclusion", "cta"] as const;
export const SegmentRoleSchema = z.enum(SEGMENT_ROLES);

export const ScriptSegmentSchema = z.object({
  id: z.string().min(1).max(40),
  role: SegmentRoleSchema,
  /** Narración (lo que se dice). */
  text: z.string().trim().min(1).max(1200),
  /** Texto breve en pantalla (opcional). */
  onScreen: z.string().max(140).optional(),
  /** Sugerencia de escena para el storyboard. */
  visualHint: SceneTypeSchema.optional(),
  /** IDs de claims que respaldan el segmento. */
  claimIds: z.array(z.string()).default([]),
});
export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;

export const ScriptSettingsSchema = z.object({
  targetDuration: TargetDurationSchema,
  format: ContentFormatSchema,
  audience: z.string().max(200),
  complexity: ComplexitySchema,
  style: NarrativeStyleSchema,
});
export type ScriptSettings = z.infer<typeof ScriptSettingsSchema>;

export const ScriptSchema = z.object({
  segments: z.array(ScriptSegmentSchema).min(1).max(20),
  settings: ScriptSettingsSchema,
  provider: z.string(),
  approvedAt: z.string().nullable(),
  version: z.number().int().min(1),
  updatedAt: z.string(),
});
export type Script = z.infer<typeof ScriptSchema>;

/** Palabras por segundo de referencia para español narrado (≈150 ppm). */
export const SPANISH_WPS = 2.5;

export function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words / SPANISH_WPS;
}

/* ───────────────────────────── Proyecto ────────────────────────────── */

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(140),
  brand: BrandIdSchema,
  template: TemplateIdSchema,
  status: ProjectStatusSchema,
  idea: z.string().max(4000),
  isDemo: z.boolean(),
  scheduledFor: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  brand: BrandIdSchema,
  template: TemplateIdSchema,
  idea: z.string().trim().max(4000).default(""),
  scheduledFor: z.string().nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  template: TemplateIdSchema.optional(),
  status: ProjectStatusSchema.optional(),
  idea: z.string().trim().max(4000).optional(),
  scheduledFor: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

/* ───────────────────────────── Narración ───────────────────────────── */

export const NarrationSchema = z.object({
  id: z.string(),
  kind: z.enum(["upload", "elevenlabs", "demo-tts"]),
  /** Ruta relativa dentro de data/media. */
  filePath: z.string(),
  mime: z.string(),
  durationInSeconds: z.number(),
  alignmentSource: z.enum(["elevenlabs", "whisper", "estimated"]),
  words: z.array(WordTimingSchema),
  createdAt: z.string(),
});
export type Narration = z.infer<typeof NarrationSchema>;

/* ─────────────────────────────── Render ────────────────────────────── */

export const RENDER_STATUSES = ["queued", "bundling", "rendering", "done", "error", "cancelled"] as const;
export const RenderStatusSchema = z.enum(RENDER_STATUSES);
export const RenderQualitySchema = z.enum(["preview", "final"]);

export const RenderJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: RenderStatusSchema,
  quality: RenderQualitySchema,
  progress: z.number().min(0).max(1),
  outputPath: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  /** Metadatos verificados con ffprobe tras el render. */
  outputMeta: z
    .object({ width: z.number(), height: z.number(), durationInSeconds: z.number(), fps: z.number(), sizeBytes: z.number(), hasAudio: z.boolean() })
    .nullable(),
});
export type RenderJob = z.infer<typeof RenderJobSchema>;

/* ───────────────────────── Assets y métricas ───────────────────────── */

export const ASSET_KINDS = ["character-front", "character-side", "character-hands", "logo", "image", "music"] as const;
export const AssetKindSchema = z.enum(ASSET_KINDS);

export const AssetSchema = z.object({
  id: z.string(),
  brand: BrandIdSchema,
  kind: AssetKindSchema,
  label: z.string().max(120),
  filePath: z.string(),
  mime: z.string(),
  licenseNote: z.string().max(300).nullable(),
  createdAt: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const PLATFORMS = ["tiktok", "instagram", "youtube-shorts", "other"] as const;
export const MetricEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  platform: z.enum(PLATFORMS),
  url: z.string().max(500).nullable(),
  views: z.number().int().min(0).nullable(),
  likes: z.number().int().min(0).nullable(),
  comments: z.number().int().min(0).nullable(),
  shares: z.number().int().min(0).nullable(),
  saves: z.number().int().min(0).nullable(),
  recordedAt: z.string(),
  /** manual | csv : las métricas solo provienen del usuario. */
  origin: z.enum(["manual", "csv"]),
});
export type MetricEntry = z.infer<typeof MetricEntrySchema>;
