/**
 * Investigación: ingesta de entradas (URL, texto, pregunta) → fuentes → análisis (IA o modo offline).
 * Regla: no se inventan fechas, precios, benchmarks ni funciones. Sin IA, las afirmaciones se extraen
 * literalmente de las fuentes y quedan "unverified" para revisión humana.
 */
import { z } from "zod";
import { newId, nowIso } from "../ids";
import { getProject, getResearch, saveResearch, advanceStatus } from "../store";
import { safeFetchText } from "../security/url";
import { candidateClaims, classifySource, extractPage } from "./html";
import { completeJson, getTextProvider } from "../ai/provider";
import { buildResearchPrompt } from "../ai/prompts";
import { ClaimStatusSchema, ContentFormatSchema, type Claim, type Research, type Source } from "@/shared/schema";

export const ResearchInputSchema = z.object({
  kind: z.enum(["url", "text", "question"]),
  value: z.string().trim().min(1).max(20000),
  title: z.string().trim().max(300).optional(),
});
export type ResearchInput = z.infer<typeof ResearchInputSchema>;

export const RunResearchSchema = z.object({
  inputs: z.array(ResearchInputSchema).max(10).default([]),
  mode: z.enum(["append", "replace"]).default("append"),
  /** Si false, solo ingiere fuentes sin re-analizar. */
  analyze: z.boolean().default(true),
});

const AiResearchSchema = z.object({
  summary: z.string().max(4000),
  angles: z.array(z.object({ title: z.string().max(120), rationale: z.string().max(400), format: ContentFormatSchema })).max(6),
  claims: z.array(z.object({ sourceId: z.string().nullable(), text: z.string().min(1).max(600), status: ClaimStatusSchema, note: z.string().max(400).nullable() })).max(30),
});

export interface IngestReport {
  added: number;
  errors: { input: string; error: string }[];
}

async function ingest(inputs: ResearchInput[]): Promise<{ sources: Source[]; questions: string[]; report: IngestReport }> {
  const sources: Source[] = [];
  const questions: string[] = [];
  const errors: IngestReport["errors"] = [];
  for (const inp of inputs) {
    if (inp.kind === "question") {
      questions.push(inp.value);
      continue;
    }
    if (inp.kind === "text") {
      sources.push({
        id: newId("s_"),
        url: null,
        title: inp.title || "Texto proporcionado por el usuario",
        publisher: null,
        publishedAt: null,
        accessedAt: nowIso(),
        kind: "secondary",
        excerpt: inp.value.slice(0, 20000),
      });
      continue;
    }
    try {
      const r = await safeFetchText(inp.value);
      if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
      const page = /html|xml/.test(r.contentType) || r.text.trimStart().startsWith("<") ? extractPage(r.text, r.url) : { title: inp.title ?? r.url, publisher: null, publishedAt: null, text: r.text.slice(0, 20000) };
      sources.push({
        id: newId("s_"),
        url: r.url,
        title: inp.title || page.title,
        publisher: page.publisher,
        publishedAt: page.publishedAt,
        accessedAt: nowIso(),
        kind: classifySource(r.url),
        excerpt: page.text,
      });
    } catch (e) {
      // La URL se registra igualmente (sin extracto) para que el usuario pueda pegar el texto a mano.
      errors.push({ input: inp.value, error: (e as Error).message });
      sources.push({
        id: newId("s_"),
        url: inp.value,
        title: inp.title || inp.value,
        publisher: null,
        publishedAt: null,
        accessedAt: nowIso(),
        kind: classifySource(inp.value),
        excerpt: null,
      });
    }
  }
  return { sources, questions, report: { added: sources.length, errors } };
}

function offlineAnalysis(idea: string, sources: Source[], existingClaims: Claim[]): Pick<Research, "summary" | "angles" | "claims" | "provider"> {
  const claims: Claim[] = [...existingClaims];
  const known = new Set(claims.map((c) => c.text));
  for (const s of sources) {
    if (!s.excerpt) continue;
    for (const text of candidateClaims(s.excerpt, 5)) {
      if (known.has(text)) continue;
      known.add(text);
      claims.push({ id: newId("c_"), sourceId: s.id, text: text.slice(0, 600), status: "unverified", note: "Extraída automáticamente sin IA. Verifica contra la fuente." });
    }
  }
  const withText = sources.filter((s) => s.excerpt);
  const summary = withText.length
    ? `Resumen automático sin IA (revisar): ${withText.length} fuente(s) con texto. ` +
      withText
        .slice(0, 3)
        .map((s) => `«${s.title}»${s.publisher ? ` (${s.publisher})` : ""}: ${s.excerpt!.replace(/\s+/g, " ").slice(0, 220)}…`)
        .join(" ")
    : "Sin fuentes con texto todavía. Agrega una URL o pega el texto de un artículo. Configura ANTHROPIC_API_KEY para análisis con IA.";
  return {
    summary: summary.slice(0, 4000),
    angles: [
      { title: "Explicación conceptual", rationale: `Explicar desde cero: ${idea.slice(0, 160)}`, format: "concept" },
      { title: "Tutorial práctico", rationale: "Mostrar paso a paso cómo aplicarlo en una tarea real.", format: "tutorial" },
    ],
    claims,
    provider: "offline",
  };
}

export async function runResearch(projectId: string, body: z.infer<typeof RunResearchSchema>) {
  const project = getProject(projectId);
  if (!project) throw new Error("Proyecto no encontrado");
  const prev = getResearch(projectId);
  const { sources: newSources, questions, report } = await ingest(body.inputs);
  const sources = body.mode === "replace" ? newSources : [...(prev?.sources ?? []), ...newSources];
  const baseClaims = body.mode === "replace" ? [] : prev?.claims ?? [];

  let analysis: Pick<Research, "summary" | "angles" | "claims" | "provider">;
  const provider = getTextProvider();
  if (!body.analyze) {
    analysis = { summary: prev?.summary ?? "", angles: prev?.angles ?? [], claims: baseClaims, provider: prev?.provider ?? "manual" };
  } else if (provider && sources.some((s) => s.excerpt)) {
    const prompt = buildResearchPrompt({
      brand: project.brand,
      idea: [project.idea, ...questions].filter(Boolean).join("\n"),
      today: nowIso().slice(0, 10),
      sources: sources
        .filter((s) => s.excerpt)
        .map((s) => ({ id: s.id, title: s.title, url: s.url, publisher: s.publisher, publishedAt: s.publishedAt, kind: s.kind, excerpt: s.excerpt!.slice(0, 8000) })),
    });
    const out = await completeJson(provider, prompt, AiResearchSchema, { projectId, operation: "research", maxTokens: 4000 });
    const ids = new Set(sources.map((s) => s.id));
    analysis = {
      summary: out.summary,
      angles: out.angles,
      // Claims de la IA: se descarta cualquier sourceId que no exista (evita referencias inventadas).
      claims: [
        ...baseClaims.filter((c) => c.status === "verified"),
        ...out.claims.map((c) => ({ id: newId("c_"), sourceId: c.sourceId && ids.has(c.sourceId) ? c.sourceId : null, text: c.text, status: c.sourceId && ids.has(c.sourceId) ? c.status : ("unverified" as const), note: c.note })),
      ],
      provider: `${provider.id}:${provider.model}`,
    };
  } else {
    analysis = offlineAnalysis([project.idea, ...questions].join(" "), sources, baseClaims);
  }

  const saved = saveResearch(projectId, { ...analysis, sources, isDemo: false });
  advanceStatus(projectId, "research");
  return { research: saved, report };
}
