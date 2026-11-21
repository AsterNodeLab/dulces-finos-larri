import { CompositionPropsSchema, type RenderJob } from "@/shared/schema";
import { createRenderJob, getProject, getRenderJob, getRenderJobSpec } from "../store";
import { buildRenderSpec } from "../storyboard/service";
import { renderBackend } from "./backend";

export class RenderError extends Error {}

export function enqueueRender(projectId: string, quality: RenderJob["quality"]): RenderJob {
  if (!getProject(projectId)) throw new RenderError("Proyecto no encontrado");
  const spec = buildRenderSpec(projectId);
  // Validación final del contrato antes de encolar (lo que se renderiza es exactamente esto).
  CompositionPropsSchema.parse({ spec, assetBaseUrl: null });
  const job = createRenderJob(projectId, quality, spec);
  renderBackend().kick();
  return job;
}

export function retryRender(jobId: string): RenderJob {
  const old = getRenderJob(jobId);
  const spec = getRenderJobSpec(jobId);
  if (!old || !spec) throw new RenderError("Trabajo no encontrado");
  if (old.status === "queued" || old.status === "bundling" || old.status === "rendering") throw new RenderError("El trabajo sigue en curso");
  // Reintento con el spec actual del proyecto (incluye correcciones posteriores al fallo).
  return enqueueRender(old.projectId, old.quality);
}
