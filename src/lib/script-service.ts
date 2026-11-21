/**
 * Scriptwriter: genera, regenera segmentos y aprueba guiones.
 * Con proveedor IA: prompts de src/lib/ai/prompts.ts + validación Zod. Sin IA: esqueleto determinista
 * (buildOfflineScript) que solo usa la idea, el resumen y los claims, con huecos [Completa: …].
 */
import { z } from "zod";
import { getProject, getResearch, getScript, saveScript, advanceStatus } from "./store";
import { completeJson, getTextProvider } from "./ai/provider";
import { buildScriptPrompt, buildSegmentRegenPrompt } from "./ai/prompts";
import { SCRIPT_TEMPLATES, buildOfflineScript, wordBudget } from "@/content/script-templates";
import { ScriptSegmentSchema, ScriptSettingsSchema, type ScriptSegment, type ScriptSettings } from "@/shared/schema";

export class ScriptError extends Error {}

function claimsFor(projectId: string) {
  const r = getResearch(projectId);
  return { summary: r?.summary ?? "", claims: (r?.claims ?? []).map((c) => ({ id: c.id, text: c.text, status: c.status })) };
}

/** Asegura ids únicos y estables (seg-1..n) y descarta claimIds inexistentes. */
function normalizeSegments(segs: ScriptSegment[], validClaimIds: Set<string>): ScriptSegment[] {
  const used = new Set<string>();
  return segs.map((s, i) => {
    let id = s.id && /^[\w-]{1,40}$/.test(s.id) ? s.id : `seg-${i + 1}`;
    if (used.has(id)) id = `seg-${i + 1}-${used.size}`;
    used.add(id);
    return { ...s, id, claimIds: (s.claimIds ?? []).filter((c) => validClaimIds.has(c)) };
  });
}

export async function generateScript(projectId: string, settings: ScriptSettings) {
  const project = getProject(projectId);
  if (!project) throw new ScriptError("Proyecto no encontrado");
  const { summary, claims } = claimsFor(projectId);
  const provider = getTextProvider();
  const valid = new Set(claims.map((c) => c.id));
  let segments: ScriptSegment[];
  let providerId: string;
  if (provider) {
    const budget = wordBudget(settings.targetDuration);
    const segmentPlan = SCRIPT_TEMPLATES[settings.format].segments.map((s) => ({ role: s.role, guidance: s.guidance, words: Math.max(4, Math.round(s.share * budget)) }));
    const out = await completeJson(
      provider,
      buildScriptPrompt({ brand: project.brand, idea: project.idea, summary, claims, settings, template: project.template, segmentPlan }),
      z.object({ segments: z.array(ScriptSegmentSchema).min(1).max(20) }),
      { projectId, operation: "script", maxTokens: 3000 },
    );
    segments = out.segments;
    providerId = `${provider.id}:${provider.model}`;
  } else {
    segments = buildOfflineScript({ idea: project.idea || project.title, brand: project.brand, settings, claims, summary });
    providerId = "offline";
  }
  const saved = saveScript(projectId, normalizeSegments(segments, valid), settings, providerId, null);
  advanceStatus(projectId, "script");
  return saved;
}

export const SaveScriptSchema = z.object({ segments: z.array(ScriptSegmentSchema).min(1).max(20), settings: ScriptSettingsSchema });

export function saveManualScript(projectId: string, input: z.infer<typeof SaveScriptSchema>) {
  const { claims } = claimsFor(projectId);
  const prev = getScript(projectId);
  const saved = saveScript(projectId, normalizeSegments(input.segments, new Set(claims.map((c) => c.id))), input.settings, prev?.provider === "offline" || !prev ? "manual" : `${prev.provider}+edit`, null);
  advanceStatus(projectId, "script");
  return saved;
}

export async function regenerateSegment(projectId: string, segmentId: string, instruction: string) {
  const project = getProject(projectId);
  const script = getScript(projectId);
  if (!project || !script) throw new ScriptError("No hay guion para regenerar");
  const idx = script.segments.findIndex((s) => s.id === segmentId);
  if (idx < 0) throw new ScriptError("Segmento no encontrado");
  const provider = getTextProvider();
  if (!provider) throw new ScriptError("Regenerar requiere un proveedor de IA (ANTHROPIC_API_KEY). Sin IA puedes editar el segmento a mano.");
  const { claims } = claimsFor(projectId);
  const out = await completeJson(
    provider,
    buildSegmentRegenPrompt({ brand: project.brand, segments: script.segments, segmentId, instruction: instruction || "Mejora claridad y precisión.", claims, settings: script.settings }),
    z.object({ segment: ScriptSegmentSchema }),
    { projectId, operation: "script-segment", maxTokens: 1200 },
  );
  const segments = [...script.segments];
  segments[idx] = { ...out.segment, id: segmentId, role: script.segments[idx].role };
  return saveScript(projectId, normalizeSegments(segments, new Set(claims.map((c) => c.id))), script.settings, `${provider.id}:${provider.model}`, null);
}
