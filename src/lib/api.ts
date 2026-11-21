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
  // Exigir JSON impide "simple requests" cross-site (text/plain, form-urlencoded) sin preflight CORS.
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new HttpError(415, "Content-Type debe ser application/json");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "El cuerpo debe ser JSON válido");
  }
  return schema.parse(body);
}

/**
 * Protección CSRF para una API local sin sesiones: en métodos que modifican estado se rechazan
 * peticiones de otro origen (Origin distinto al Host o Sec-Fetch-Site: cross-site).
 * Peticiones sin Origin (curl, scripts locales) se permiten: la app escucha solo en 127.0.0.1.
 */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", ...(process.env.VQ_ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean)]);

export function assertSameOrigin(req: Request) {
  // Anti DNS-rebinding: solo se atiende a hosts locales (o los declarados en VQ_ALLOWED_HOSTS).
  const hostHeader = (req.headers.get("host") ?? "").toLowerCase();
  const hostname = hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0];
  if (hostname && !LOCAL_HOSTS.has(hostname)) throw new HttpError(403, "Host no permitido");
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Petición de otro sitio bloqueada");
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") {
    if (origin === "null") throw new HttpError(403, "Origen no permitido");
    return;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origen no permitido");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || originHost !== host) throw new HttpError(403, "Petición de otro origen bloqueada");
}

/** Rechaza cuerpos demasiado grandes ANTES de leerlos en memoria (exige Content-Length). */
export function assertBodySize(req: Request, maxMb: number) {
  const len = Number(req.headers.get("content-length"));
  if (!Number.isFinite(len) || len <= 0) throw new HttpError(411, "Se requiere Content-Length");
  if (len > (maxMb + 1) * 1024 * 1024) throw new HttpError(413, `El archivo supera ${maxMb} MB`);
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      if (args[0] instanceof Request) assertSameOrigin(args[0]);
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
