/**
 * Radar sencillo: lee feeds RSS/Atom públicos y oficiales. No es un crawler.
 * Configurable con RADAR_FEEDS="url1,url2" en .env.local. Cada feed falla de forma aislada.
 */
import { env } from "../env";
import { safeFetchText } from "../security/url";
import { decodeEntities } from "./html";
import type { BrandId } from "@/shared/brands";

export interface RadarFeed {
  url: string;
  label: string;
  brand: BrandId;
}

export const DEFAULT_FEEDS: RadarFeed[] = [
  { url: "https://openai.com/news/rss.xml", label: "OpenAI News", brand: "vision-one" },
  { url: "https://blog.google/technology/ai/rss/", label: "Google AI Blog", brand: "vision-one" },
  { url: "https://huggingface.co/blog/feed.xml", label: "Hugging Face Blog", brand: "vision-one" },
  { url: "https://github.blog/feed/", label: "GitHub Blog", brand: "vision-one" },
  { url: "https://rss.arxiv.org/rss/cs.AI", label: "arXiv cs.AI", brand: "vision-one" },
  { url: "https://www.federalreserve.gov/feeds/press_all.xml", label: "Federal Reserve (prensa)", brand: "visionquant" },
];

export interface RadarItem {
  title: string;
  url: string;
  publishedAt: string | null;
  feed: string;
  brand: BrandId;
}

export interface RadarResult {
  items: RadarItem[];
  feeds: { label: string; url: string; ok: boolean; error?: string; count: number }[];
  fetchedAt: string;
}

const g = globalThis as unknown as { __vqRadar?: { at: number; data: RadarResult } };

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]).replace(/<[^>]+>/g, "").trim() : null;
}

export function parseFeed(xml: string, feed: RadarFeed): RadarItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocks.slice(0, 15).flatMap((b) => {
    const title = tag(b, "title");
    let link = tag(b, "link");
    if (!link) link = b.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
    if (!title || !link || !/^https?:\/\//.test(link)) return [];
    const rawDate = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const d = rawDate ? new Date(rawDate) : null;
    return [{ title: title.slice(0, 200), url: link, publishedAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null, feed: feed.label, brand: feed.brand }];
  });
}

export async function getRadar(force = false): Promise<RadarResult> {
  if (!force && g.__vqRadar && Date.now() - g.__vqRadar.at < 30 * 60_000) return g.__vqRadar.data;
  const feeds: RadarFeed[] = env.radarFeeds.length
    ? env.radarFeeds.map((url) => ({ url, label: new URL(url).hostname, brand: "vision-one" as BrandId }))
    : DEFAULT_FEEDS;
  const results = await Promise.all(
    feeds.map(async (f) => {
      try {
        const r = await safeFetchText(f.url, { timeoutMs: 10000, maxBytes: 2 * 1024 * 1024, accept: "application/rss+xml,application/atom+xml,application/xml,text/xml" });
        if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
        const items = parseFeed(r.text, f);
        return { feed: f, items, ok: true as const };
      } catch (e) {
        return { feed: f, items: [] as RadarItem[], ok: false as const, error: (e as Error).message.slice(0, 160) };
      }
    }),
  );
  const data: RadarResult = {
    items: results
      .flatMap((r) => r.items)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 60),
    feeds: results.map((r) => ({ label: r.feed.label, url: r.feed.url, ok: r.ok, error: "error" in r ? r.error : undefined, count: r.items.length })),
    fetchedAt: new Date().toISOString(),
  };
  g.__vqRadar = { at: Date.now(), data };
  return data;
}
