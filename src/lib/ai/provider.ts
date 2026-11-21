/**
 * Adaptadores de proveedores de texto (servidor). Sin SDKs: fetch directo para mantener dependencias mínimas.
 * - Anthropic (principal). Modelo configurable con ANTHROPIC_MODEL.
 * - OpenAI (opcional) solo si OPENAI_API_KEY y OPENAI_MODEL están definidos (no asumimos IDs de modelo).
 * Sin credenciales → getTextProvider() devuelve null y la app usa el modo offline/demo (nunca inventa respuestas).
 */
import type { z } from "zod";
import { env } from "../env";
import { logAiUsage } from "../store";
import { assertWithinRate } from "../security/rate-limit";

export interface Prompt {
  system: string;
  user: string;
}

export interface TextProvider {
  id: "anthropic" | "openai";
  model: string;
  complete(prompt: Prompt, opts: { maxTokens: number; projectId: string | null; operation: string }): Promise<string>;
}

/** Precios USD por millón de tokens (entrada/salida). Fuente: docs/RESEARCH_NOTES.md (platform.claude.com, nov 2026). */
const ANTHROPIC_PRICES: Record<string, [number, number]> = {
  "claude-fable-5-2": [8, 40],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export class ProviderError extends Error {}

const anthropic: TextProvider = {
  id: "anthropic",
  get model() {
    return env.anthropicModel;
  },
  async complete(prompt, { maxTokens, projectId, operation }) {
    assertWithinRate("anthropic", env.anthropicMaxCallsPerHour);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": process.env.ANTHROPIC_VERSION ?? "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: maxTokens,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new ProviderError(`Anthropic ${res.status}: ${body.error?.message ?? "error desconocido"}`);
    const inTok = body.usage?.input_tokens ?? 0;
    const outTok = body.usage?.output_tokens ?? 0;
    const price = ANTHROPIC_PRICES[env.anthropicModel];
    logAiUsage({
      projectId,
      provider: "anthropic",
      model: env.anthropicModel,
      operation,
      inputTokens: inTok,
      outputTokens: outTok,
      estCostUsd: price ? (inTok * price[0] + outTok * price[1]) / 1e6 : null,
    });
    return (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  },
};

const openai: TextProvider = {
  id: "openai",
  get model() {
    return process.env.OPENAI_MODEL ?? "";
  },
  async complete(prompt, { maxTokens, projectId, operation }) {
    assertWithinRate("openai", env.anthropicMaxCallsPerHour);
    const model = process.env.OPENAI_MODEL!;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.openaiApiKey}` },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new ProviderError(`OpenAI ${res.status}: ${body.error?.message ?? "error desconocido"}`);
    logAiUsage({
      projectId,
      provider: "openai",
      model,
      operation,
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
      estCostUsd: null,
    });
    return body.choices?.[0]?.message?.content ?? "";
  },
};

/** Proveedor activo: AI_PROVIDER=anthropic|openai (por defecto anthropic si hay clave). */
export function getTextProvider(): TextProvider | null {
  const pref = process.env.AI_PROVIDER ?? "anthropic";
  const hasAnthropic = Boolean(env.anthropicApiKey);
  const hasOpenai = Boolean(env.openaiApiKey && process.env.OPENAI_MODEL);
  if (pref === "openai" && hasOpenai) return openai;
  if (hasAnthropic) return anthropic;
  if (hasOpenai) return openai;
  return null;
}

/** Extrae el primer objeto JSON de una respuesta de texto. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ProviderError("La respuesta del modelo no contiene JSON");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Llama al proveedor y valida la respuesta con Zod. Si no valida, reintenta UNA vez
 * mostrando al modelo los errores. Nunca devuelve datos sin validar.
 */
export async function completeJson<S extends z.ZodTypeAny>(
  provider: TextProvider,
  prompt: Prompt,
  schema: S,
  opts: { maxTokens?: number; projectId: string | null; operation: string },
): Promise<z.infer<S>> {
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const p =
      attempt === 0
        ? prompt
        : { system: prompt.system, user: `${prompt.user}\n\nTu respuesta anterior no pasó la validación:\n${lastErr}\nResponde SOLO con JSON válido que cumpla el formato.` };
    const text = await provider.complete(p, { maxTokens: opts.maxTokens ?? 4000, projectId: opts.projectId, operation: opts.operation });
    try {
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastErr = parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  throw new ProviderError(`El modelo devolvió datos inválidos tras 2 intentos: ${lastErr.slice(0, 600)}`);
}
