/**
 * Validación de URLs externas (protección SSRF básica para una herramienta local).
 * Solo http/https, sin credenciales embebidas, sin hosts locales/privados.
 */
import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const l = ip.toLowerCase();
  if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80");
}

export class UnsafeUrlError extends Error {}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError("URL inválida");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UnsafeUrlError("Solo se permiten URLs http(s)");
  if (u.username || u.password) throw new UnsafeUrlError("La URL no puede contener credenciales");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("No se permiten hosts locales");
  }
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  // Si DNS no resuelve (p. ej. detrás de un proxy), dejamos que fetch falle por sí mismo; solo bloqueamos IPs privadas conocidas.
  if (addrs.some(isPrivateIp)) throw new UnsafeUrlError("La URL apunta a una red privada o local");
  return u;
}

/** fetch con timeout, límite de tamaño y redirecciones revalidadas. */
export async function safeFetchText(raw: string, opts: { maxBytes?: number; timeoutMs?: number; accept?: string } = {}): Promise<{ url: string; status: number; contentType: string; text: string }> {
  const maxBytes = opts.maxBytes ?? 3 * 1024 * 1024;
  let current = (await assertSafeUrl(raw)).toString();
  for (let hop = 0; hop < 5; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "VisionQuantStudio/0.1 (+local research tool)", accept: opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = (await assertSafeUrl(new URL(res.headers.get("location")!, current).toString())).toString();
        continue;
      }
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }
      const text = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
      return { url: current, status: res.status, contentType: res.headers.get("content-type") ?? "", text };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new UnsafeUrlError("Demasiadas redirecciones");
}
