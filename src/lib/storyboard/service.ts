/**
 * Storyboard + Motion Director.
 * El storyboard es un VideoSpec validado (src/shared/schema.ts). Dos generadores:
 *  - IA (Motion Director): el modelo elige escenas de la BIBLIOTECA VALIDADA y sus props → Zod.
 *    Nunca se ejecuta código generado por el modelo; solo datos.
 *  - Determinista (sin IA): mapea rol del guion → escena de la plantilla y deriva textos del guion.
 */
import { z } from "zod";
import { BRANDS } from "@/shared/brands";
import { TEMPLATES } from "@/shared/templates";
import {
  CameraSchema,
  SceneSchema,
  SceneTypeSchema,
  TransitionSchema,
  type Scene,
  type ScriptSegment,
  type VideoSpec,
  VideoSpecSchema,
} from "@/shared/schema";
import { completeJson, getTextProvider } from "../ai/provider";
import { SCENE_CATALOG, buildMotionDirectorPrompt } from "../ai/prompts";
import { advanceStatus, getActiveNarration, getProject, getResearch, getScript, getStoryboard, saveStoryboard } from "../store";
import { estimatedSceneFrames, syncSpec } from "./sync";

export class StoryboardError extends Error {}

/** Recorta en límite de palabra. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "") + "…";
}

function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
}

/** Divide el texto de un segmento en k partes contiguas por oraciones (sin perder palabras). */
export function splitNarration(text: string, k: number): string[] {
  const ss = sentences(text);
  if (k <= 1 || ss.length < 2) return [text.trim(), ...Array(Math.max(0, k - 1)).fill("")];
  const out: string[] = [];
  const per = Math.ceil(ss.length / k);
  for (let i = 0; i < k; i++) out.push(ss.slice(i * per, (i + 1) * per).join(" "));
  return out;
}

const firstSentence = (t: string) => sentences(t)[0] ?? t;

function phrases(text: string, n: number, max: number): string[] {
  const parts = text
    .split(/(?<=[.!?…;:])\s+|,\s+/)
    .map((p) => p.replace(/[.!?…;:,]+$/, "").trim())
    .filter((p) => p.length > 3);
  return parts.slice(0, n).map((p) => clip(p, max));
}

/** Escena determinista a partir de un segmento. Evita escenas que exigen datos (comparativas, métricas, fechas). */
export function sceneFromSegment(seg: ScriptSegment, i: number, ctx: { brand: VideoSpec["brand"]; template: VideoSpec["template"]; sources: { title: string; publisher: string | null; url: string | null; publishedAt: string | null }[] }): Scene {
  const tpl = TEMPLATES[ctx.template];
  let type = seg.visualHint ?? tpl.roleToScene[seg.role];
  if (type === "AIModelComparison" || type === "MetricCounter" || type === "TimelineScene" || type === "QuoteCard") type = "FeatureExplainer";
  if (type === "SourceAttribution" && !ctx.sources.length) type = "CrystalPresenter";
  const base = { id: `scene-${i + 1}`, narration: seg.text, transition: i === 0 ? ("none" as const) : ("fade" as const), camera: "drift" as const, lockedDuration: false, durationInFrames: 90 };
  const label = seg.onScreen?.trim() || firstSentence(seg.text);
  const pts = phrases(seg.text, 4, 30);
  const scene = (() => {
    switch (type) {
      case "AnimatedHook":
        return { ...base, type, props: { headline: clip(label, 90), visual: "question" as const } };
      case "EditorialTitle":
        return { ...base, type, props: { eyebrow: clip(seg.role.toUpperCase(), 40), title: clip(label, 80) } };
      case "ConceptDiagram":
        return { ...base, type, props: { title: clip(label, 70), center: clip(seg.onScreen ?? "Idea central", 28), nodes: (pts.length >= 2 ? pts : ["Punto 1", "Punto 2"]).slice(0, 4).map((l) => ({ label: clip(l, 28) })), layout: "radial" as const } };
      case "AnimatedWorkflow":
        return { ...base, type, props: { title: clip(label, 70), steps: (pts.length >= 2 ? pts : ["Paso 1", "Paso 2", "Paso 3"]).map((l) => ({ label: clip(l, 30) })), loop: false } };
      case "FeatureExplainer":
        return { ...base, type, props: { title: clip(label, 70), features: (pts.length ? pts : [label]).slice(0, 3).map((p) => ({ title: clip(p, 36), description: "" })) } };
      case "SourceAttribution":
        return {
          ...base,
          type,
          props: { sources: ctx.sources.slice(0, 4).map((s) => ({ title: clip(s.title, 90), publisher: clip(s.publisher ?? (s.url ? new URL(s.url).hostname : "Fuente"), 50), url: s.url ?? undefined, date: s.publishedAt?.slice(0, 10) })) },
        };
      case "BrandedOutro":
        return { ...base, type, props: { message: clip(label, 100), handle: BRANDS[ctx.brand].handle } };
      case "CrystalPresenter":
      default:
        return { ...base, type: "CrystalPresenter" as const, props: { line: clip(label, 110), pose: "explain" as const, side: "right" as const } };
    }
  })();
  return SceneSchema.parse(scene);
}

const DirectorOutSchema = z.object({
  scenes: z
    .array(z.object({ segmentId: z.string(), type: SceneTypeSchema, props: z.record(z.string(), z.unknown()), transition: TransitionSchema.optional(), camera: CameraSchema.optional() }))
    .min(1)
    .max(30),
});

/** Convierte la salida del Motion Director en escenas validadas. Las inválidas se sustituyen por la versión determinista. */
export function scenesFromDirector(out: z.infer<typeof DirectorOutSchema>, segments: ScriptSegment[], ctx: Parameters<typeof sceneFromSegment>[2]): { scenes: Scene[]; rejected: number } {
  const bySeg = new Map<string, typeof out.scenes>();
  for (const s of out.scenes) bySeg.set(s.segmentId, [...(bySeg.get(s.segmentId) ?? []), s]);
  const scenes: Scene[] = [];
  let rejected = 0;
  segments.forEach((seg) => {
    const planned = bySeg.get(seg.id) ?? [];
    if (!planned.length) {
      scenes.push(sceneFromSegment(seg, scenes.length, ctx));
      return;
    }
    const parts = splitNarration(seg.text, planned.length);
    planned.forEach((p, k) => {
      const candidate = { id: `scene-${scenes.length + 1}`, type: p.type, props: p.props, narration: parts[k] ?? "", transition: p.transition ?? (scenes.length ? "fade" : "none"), camera: p.camera ?? "drift", lockedDuration: false, durationInFrames: 90 };
      const parsed = SceneSchema.safeParse(candidate);
      if (parsed.success) scenes.push(parsed.data);
      else {
        rejected++;
        scenes.push({ ...sceneFromSegment({ ...seg, text: parts[k] || seg.text }, scenes.length, ctx), narration: parts[k] ?? "" });
      }
    });
  });
  return { scenes, rejected };
}

export async function generateStoryboard(projectId: string, opts: { useAi?: boolean } = {}) {
  const project = getProject(projectId);
  const script = getScript(projectId);
  if (!project) throw new StoryboardError("Proyecto no encontrado");
  if (!script) throw new StoryboardError("Primero crea un guion.");
  if (!script.approvedAt) throw new StoryboardError("Aprueba el guion antes de crear el storyboard.");
  const research = getResearch(projectId);
  const ctx = { brand: project.brand, template: project.template, sources: (research?.sources ?? []).map((s) => ({ title: s.title, publisher: s.publisher, url: s.url, publishedAt: s.publishedAt })) };

  let scenes: Scene[];
  let provider = "deterministic";
  let rejected = 0;
  const ai = opts.useAi === false ? null : getTextProvider();
  if (ai) {
    const out = await completeJson(ai, buildMotionDirectorPrompt({ brand: project.brand, template: project.template, segments: script.segments, sceneCatalog: SCENE_CATALOG }), DirectorOutSchema, {
      projectId,
      operation: "motion-director",
      maxTokens: 6000,
    });
    ({ scenes, rejected } = scenesFromDirector(out, script.segments, ctx));
    provider = `${ai.id}:${ai.model}`;
  } else {
    scenes = script.segments.map((seg, i) => sceneFromSegment(seg, i, ctx));
  }
  const prev = getStoryboard(projectId)?.spec;
  const draft: VideoSpec = VideoSpecSchema.parse({
    version: 1,
    brand: project.brand,
    template: project.template,
    title: project.title,
    fps: prev?.fps ?? 30,
    scenes: scenes.map((s) => ({ ...s, durationInFrames: estimatedSceneFrames(s, prev?.fps ?? 30) })),
    captions: { enabled: true, position: "lower", keywords: prev?.captions.keywords ?? [], maxCharsPerLine: 26, words: [] },
    demoWatermark: project.isDemo,
    music: prev?.music,
  });
  const saved = saveStoryboard(projectId, applyNarration(projectId, draft), provider);
  advanceStatus(projectId, "production");
  return { ...saved, rejected };
}

/** Aplica la narración activa (si existe) al spec: duraciones + subtítulos. */
export function applyNarration(projectId: string, spec: VideoSpec): VideoSpec {
  const n = getActiveNarration(projectId);
  return syncSpec({ spec, audio: n ? { src: n.filePath, durationInSeconds: n.durationInSeconds, words: n.words } : null });
}

/** Guarda un spec editado por el usuario, re-sincronizando con la narración. */
export function saveEditedStoryboard(projectId: string, spec: VideoSpec) {
  const project = getProject(projectId);
  if (!project) throw new StoryboardError("Proyecto no encontrado");
  // La marca del proyecto manda: no se mezclan marcas desde el editor.
  const fixed = VideoSpecSchema.parse({ ...spec, brand: project.brand, demoWatermark: project.isDemo || spec.demoWatermark });
  return saveStoryboard(projectId, applyNarration(projectId, fixed), getStoryboard(projectId)?.provider ?? "manual");
}

/** Spec final para render/preview: storyboard + narración activa. */
export function buildRenderSpec(projectId: string): VideoSpec {
  const sb = getStoryboard(projectId);
  if (!sb) throw new StoryboardError("No hay storyboard.");
  return applyNarration(projectId, sb.spec);
}
