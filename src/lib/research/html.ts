/** Extracción ligera de metadatos y texto de HTML (sin dependencias; no es un crawler). */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
function safeChar(code: number) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function meta(html: string, names: string[]): string | null {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, "i");
    const m = html.match(re1) ?? html.match(re2);
    if (m) return decodeEntities(m[1]).trim();
  }
  return null;
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1990 || y > 2100) return null;
  return d.toISOString();
}

export interface ExtractedPage {
  title: string;
  publisher: string | null;
  publishedAt: string | null;
  text: string;
}

export function extractPage(html: string, url: string): ExtractedPage {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = meta(html, ["og:title", "twitter:title"]) ?? (titleTag ? decodeEntities(titleTag).trim() : null) ?? url;
  const publisher = meta(html, ["og:site_name", "application-name"]) ?? host;

  let published = meta(html, ["article:published_time", "datePublished", "date", "pubdate", "publish-date", "DC.date.issued"]);
  if (!published) published = html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  if (!published) published = html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ?? null;

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|footer|header|aside|form|svg)[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? body.match(/<main[\s\S]*?<\/main>/i)?.[0];
  if (main && main.length > 500) body = main;
  const text = decodeEntities(
    body
      .replace(/<\/(p|h[1-6]|li|div|section|br|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  return { title: title.slice(0, 300), publisher: publisher?.slice(0, 120) ?? null, publishedAt: normalizeDate(published), text: text.slice(0, 20000) };
}

/** Dominios tratados como fuente primaria por defecto (el usuario puede reclasificar). */
const PRIMARY_DOMAINS = [
  "anthropic.com", "claude.com", "openai.com", "blog.google", "deepmind.google", "ai.google.dev", "googleblog.com", "microsoft.com",
  "meta.com", "ai.meta.com", "mistral.ai", "huggingface.co", "github.com", "github.blog", "nvidia.com", "apple.com", "n8n.io",
  "arxiv.org", "nature.com", "science.org", "acm.org", "ieee.org",
  "banxico.org.mx", "inegi.org.mx", "gob.mx", "federalreserve.gov", "ecb.europa.eu", "imf.org", "worldbank.org", "oecd.org", "bis.org",
  "sec.gov", "bls.gov", "bea.gov", "treasury.gov", "cepal.org", "bitcoin.org",
];

export function classifySource(url: string | null): "primary" | "secondary" {
  if (!url) return "secondary";
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.endsWith(".gov") || h.endsWith(".gob.mx") || h.startsWith("docs.") || h.startsWith("developer") || h.startsWith("platform.")) return "primary";
    return PRIMARY_DOMAINS.some((d) => h === d || h.endsWith("." + d)) ? "primary" : "secondary";
  } catch {
    return "secondary";
  }
}

/** Oraciones candidatas a afirmación (contienen cifras, fechas o verbos de anuncio). Para el modo sin IA. */
export function candidateClaims(text: string, max = 8): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 400);
  const scored = sentences.map((s) => {
    let score = 0;
    if (/\d/.test(s)) score += 2;
    if (/\b(20\d\d|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(s)) score += 2;
    if (/\b(anunci|lanz|present|introduc|announc|launch|release|available|disponible|permite|allows|supports)/i.test(s)) score += 1;
    if (/%|\$|USD|MXN|tokens|benchmark/i.test(s)) score += 1;
    return { s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.s);
}
