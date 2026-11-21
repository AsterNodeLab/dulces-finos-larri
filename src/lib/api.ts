/** Utilidades para route handlers: respuestas JSON y mapeo de errores a códigos HTTP. */
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { UnsafeUrlError } from "./security/url";
import { RateLimitError } from "./security/rate-limit";
import { ProviderError } from "./ai/provider";
import { NarrationError } from "./narration/service";
import { StoryboardError } from "./storyboard/service";
import { ScriptError } from "./script-service";
import { RenderError } from "./render/service";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = "Recurso") => new HttpError(404, `${what} no encontrado`);

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function readJson<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "El cuerpo debe ser JSON válido");
  }
  return schema.parse(body);
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) return json({ error: "Datos inválidos", issues: e.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
      if (e instanceof RateLimitError) return json({ error: e.message }, 429);
      if (e instanceof UnsafeUrlError || e instanceof NarrationError || e instanceof StoryboardError || e instanceof ScriptError || e instanceof RenderError) return json({ error: e.message }, 400);
      if (e instanceof ProviderError) return json({ error: e.message }, 502);
      console.error("[api]", e);
      return json({ error: "Error interno del servidor", detail: (e as Error)?.message?.slice(0, 300) }, 500);
    }
  };
}

export type Ctx<P> = { params: Promise<P> };
