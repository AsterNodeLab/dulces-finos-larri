/**
 * Plantillas de video. Una plantilla define la secuencia narrativa recomendada
 * (rol del guion → tipo de escena) que usa el generador de storyboard.
 * La composición de Remotion es la misma para todas: renderiza cualquier VideoSpec válido.
 */
import type { SceneType } from "./schema";
import type { TemplateId } from "./brands";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  /** Escena por defecto para cada rol del guion. */
  roleToScene: Record<"hook" | "context" | "explanation" | "demo" | "application" | "conclusion" | "cta", SceneType>;
  /** Escenas que la plantilla favorece cuando el contenido lo permite. */
  preferred: SceneType[];
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  "technology-news": {
    id: "technology-news",
    name: "Technology News",
    description: "Noticia tecnológica: hook, contexto, datos verificados, comparación y conclusión con fuentes.",
    roleToScene: {
      hook: "AnimatedHook",
      context: "TimelineScene",
      explanation: "FeatureExplainer",
      demo: "AIModelComparison",
      application: "CrystalPresenter",
      conclusion: "SourceAttribution",
      cta: "BrandedOutro",
    },
    preferred: ["MetricCounter", "AIModelComparison", "SourceAttribution", "TimelineScene"],
  },
  "ai-tutorial": {
    id: "ai-tutorial",
    name: "AI Tutorial",
    description: "Tutorial paso a paso: flujos animados, herramientas y demostración aplicada.",
    roleToScene: {
      hook: "AnimatedHook",
      context: "CrystalPresenter",
      explanation: "AnimatedWorkflow",
      demo: "AnimatedWorkflow",
      application: "FeatureExplainer",
      conclusion: "CrystalPresenter",
      cta: "BrandedOutro",
    },
    preferred: ["AnimatedWorkflow", "FeatureExplainer", "CrystalPresenter"],
  },
  "ai-explainer": {
    id: "ai-explainer",
    name: "AI Explainer",
    description: "Explicación conceptual: diagramas, movimiento de elementos y storytelling visual.",
    roleToScene: {
      hook: "AnimatedHook",
      context: "EditorialTitle",
      explanation: "ConceptDiagram",
      demo: "AnimatedWorkflow",
      application: "FeatureExplainer",
      conclusion: "CrystalPresenter",
      cta: "BrandedOutro",
    },
    preferred: ["ConceptDiagram", "AnimatedWorkflow", "CrystalPresenter", "QuoteCard"],
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
