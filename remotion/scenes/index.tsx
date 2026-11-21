/**
 * Registro de escenas: scene.type → componente. El switch es exhaustivo; si se agrega un tipo
 * nuevo al contrato (SCENE_TYPES) sin registrarlo aquí, TypeScript falla en `assertNever`.
 */
import React from "react";
import type { BrandProfile } from "../../src/shared/brands";
import type { Scene } from "../../src/shared/schema";
import { AnimatedHook } from "./AnimatedHook";
import { EditorialTitle } from "./EditorialTitle";
import { CrystalPresenter } from "./CrystalPresenter";
import { ConceptDiagram } from "./ConceptDiagram";
import { AIModelComparison } from "./AIModelComparison";
import { AnimatedWorkflow } from "./AnimatedWorkflow";
import { FeatureExplainer } from "./FeatureExplainer";
import { MetricCounter } from "./MetricCounter";
import { TimelineScene } from "./TimelineScene";
import { QuoteCard } from "./QuoteCard";
import { SourceAttribution } from "./SourceAttribution";
import { BrandedOutro } from "./BrandedOutro";

function assertNever(x: never): never {
  throw new Error(`Tipo de escena no registrado: ${JSON.stringify(x)}`);
}

export const SceneRenderer: React.FC<{ scene: Scene; brand: BrandProfile; assetBaseUrl: string | null }> = ({ scene, brand, assetBaseUrl }) => {
  const common = { brand, durationInFrames: scene.durationInFrames, assetBaseUrl };
  switch (scene.type) {
    case "AnimatedHook":
      return <AnimatedHook props={scene.props} {...common} />;
    case "EditorialTitle":
      return <EditorialTitle props={scene.props} {...common} />;
    case "CrystalPresenter":
      return <CrystalPresenter props={scene.props} {...common} />;
    case "ConceptDiagram":
      return <ConceptDiagram props={scene.props} {...common} />;
    case "AIModelComparison":
      return <AIModelComparison props={scene.props} {...common} />;
    case "AnimatedWorkflow":
      return <AnimatedWorkflow props={scene.props} {...common} />;
    case "FeatureExplainer":
      return <FeatureExplainer props={scene.props} {...common} />;
    case "MetricCounter":
      return <MetricCounter props={scene.props} {...common} />;
    case "TimelineScene":
      return <TimelineScene props={scene.props} {...common} />;
    case "QuoteCard":
      return <QuoteCard props={scene.props} {...common} />;
    case "SourceAttribution":
      return <SourceAttribution props={scene.props} {...common} />;
    case "BrandedOutro":
      return <BrandedOutro props={scene.props} {...common} />;
    default:
      return assertNever(scene);
  }
};

export { AnimatedHook, EditorialTitle, CrystalPresenter, ConceptDiagram, AIModelComparison, AnimatedWorkflow, FeatureExplainer, MetricCounter, TimelineScene, QuoteCard, SourceAttribution, BrandedOutro };
