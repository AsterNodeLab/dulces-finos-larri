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
  const l = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const embedded = embeddedIpv4(l);
  if (embedded) return isPrivateIp(embedded);
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || /^fe[89ab]/.test(l) || l.startsWith("ff");
}

/**
 * IPv4 embebida en IPv6: mapeada (::ffff:a.b.c.d o ::ffff:7f00:1), compatible (::a.b.c.d)
 * y NAT64 (64:ff9b::/96). Node normaliza ::ffff:127.0.0.1 → ::ffff:7f00:1, por eso se decodifica el hex.
 */
function embeddedIpv4(l: string): string | null {
  const m = l.match(/^(?:::ffff:|::|64:ff9b::)(.+)$/);
  if (!m) return null;
  const rest = m[1];
  if (net.isIPv4(rest)) return rest;
  const hx = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hx) return null;
  const hi = parseInt(hx[1], 16);
  const lo = parseInt(hx[2], 16);
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
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
  if (addrs.some(isPrivateIp)) throw new UnsafeUrlError("La URL apunta a una red privada o local");
  // Falla cerrado si el DNS no resuelve. Excepción explícita para entornos detrás de un proxy HTTP
  // que resuelve por sí mismo (p. ej. la nube de Claude Code): VQ_ALLOW_UNRESOLVED_DNS=1.
  if (!addrs.length && process.env.VQ_ALLOW_UNRESOLVED_DNS !== "1") throw new UnsafeUrlError("No se pudo resolver el dominio de la URL");
  // Riesgo residual documentado (docs/QA_REPORT.md): DNS rebinding entre esta validación y el fetch.
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
