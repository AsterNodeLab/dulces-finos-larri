import {
  SCENE_TYPES,
  type Scene,
  type SceneType,
  AnimatedHookProps,
  EditorialTitleProps,
  CrystalPresenterProps,
  ConceptDiagramProps,
  AIModelComparisonProps,
  AnimatedWorkflowProps,
  FeatureExplainerProps,
  MetricCounterProps,
  TimelineSceneProps,
  QuoteCardProps,
  SourceAttributionProps,
  BrandedOutroProps,
} from "@/shared/schema";
import type { ZodType } from "zod";

export const PROPS_SCHEMAS: Record<SceneType, ZodType> = {
  AnimatedHook: AnimatedHookProps,
  EditorialTitle: EditorialTitleProps,
  CrystalPresenter: CrystalPresenterProps,
  ConceptDiagram: ConceptDiagramProps,
  AIModelComparison: AIModelComparisonProps,
  AnimatedWorkflow: AnimatedWorkflowProps,
  FeatureExplainer: FeatureExplainerProps,
  MetricCounter: MetricCounterProps,
  TimelineScene: TimelineSceneProps,
  QuoteCard: QuoteCardProps,
  SourceAttribution: SourceAttributionProps,
  BrandedOutro: BrandedOutroProps,
};

const DEFAULT_PROPS: Record<SceneType, Record<string, unknown>> = {
  AnimatedHook: { kicker: "Novedad", headline: "Un titular claro en pocas palabras", visual: "pulse-grid" },
  EditorialTitle: { eyebrow: "Tema", title: "Título de la escena" },
  CrystalPresenter: { line: "La idea clave en una sola frase", pose: "explain", side: "right" },
  ConceptDiagram: { title: "Cómo se conecta", center: "Concepto", nodes: [{ label: "Parte A" }, { label: "Parte B" }, { label: "Parte C" }], layout: "radial" },
  AIModelComparison: { title: "Comparación", columns: [{ name: "Opción A" }, { name: "Opción B" }], rows: [{ label: "Criterio", values: ["Valor", "Valor"] }] },
  AnimatedWorkflow: { title: "Paso a paso", steps: [{ label: "Paso 1" }, { label: "Paso 2" }, { label: "Paso 3" }], loop: false },
  FeatureExplainer: { title: "Qué incluye", features: [{ title: "Función", description: "Qué hace, en una frase." }] },
  MetricCounter: { label: "Dato clave", value: 0, decimals: 0 },
  TimelineScene: { title: "Línea de tiempo", events: [{ date: "Antes", label: "Situación inicial" }, { date: "Ahora", label: "Qué cambió" }] },
  QuoteCard: { quote: "Cita textual de la fuente.", author: "Autor" },
  SourceAttribution: { sources: [{ title: "Título de la fuente", publisher: "Editorial" }] },
  BrandedOutro: { message: "Gracias por ver" },
};

export function newSceneId(): string {
  return `scene-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createScene(type: SceneType): Scene {
  return {
    id: newSceneId(),
    type,
    narration: "",
    durationInFrames: 150,
    transition: "fade",
    camera: "drift",
    lockedDuration: false,
    props: structuredClone(DEFAULT_PROPS[type]),
  } as Scene;
}

export function isSceneType(v: string): v is SceneType {
  return (SCENE_TYPES as readonly string[]).includes(v);
}

/** Texto corto para identificar una escena en la lista. */
export function sceneHeadline(scene: Scene): string {
  const p = scene.props as Record<string, unknown>;
  for (const k of ["headline", "title", "line", "quote", "label", "message"]) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  const sources = p.sources as { title?: string }[] | undefined;
  return sources?.[0]?.title ?? "";
}
