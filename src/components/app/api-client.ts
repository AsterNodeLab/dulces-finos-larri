/** Cliente fetch mínimo y tipado. Lanza ApiError con el mensaje `error` del servidor. */

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  issues: ApiIssue[];
  constructor(message: string, status = 0, issues: ApiIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Cuerpo JSON. */
  body?: unknown;
  /** Cuerpo multipart. */
  form?: FormData;
  signal?: AbortSignal;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET");
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, signal: opts.signal, cache: "no-store" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("No se pudo conectar con el servidor local. ¿Sigue corriendo `npm run dev`?");
  }
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; issues?: ApiIssue[]; detail?: string };
    throw new ApiError(d.error ?? `Error ${res.status}`, res.status, d.issues ?? []);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Error desconocido";
}
