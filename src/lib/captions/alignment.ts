/**
 * Alineación palabra ↔ tiempo.
 * - elevenlabs: timestamps por carácter del endpoint with-timestamps → palabras (exacto).
 * - whisper: timestamps por palabra de la transcripción (OpenAI).
 * - estimated: reparto proporcional por longitud de palabra con pausas en puntuación,
 *   anclado a silencios reales detectados en el audio (ffmpeg silencedetect). Es una ESTIMACIÓN.
 */
import type { WordTiming } from "@/shared/schema";

export function tokenize(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

/** Peso de duración de una palabra: aproximación por vocales/longitud + pausa tras puntuación. */
function weight(word: string): { speak: number; pause: number } {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, "");
  const vowels = (letters.match(/[aeiouáéíóúü]/gi) ?? []).length;
  const speak = Math.max(1, vowels || Math.ceil(letters.length / 2.5)) + (/\d/.test(letters) ? letters.length * 0.6 : 0);
  const pause = /[.!?…]$/.test(word) ? 1.6 : /[,;:]$/.test(word) ? 0.7 : /[—–-]$/.test(word) ? 0.5 : 0;
  return { speak, pause };
}

/** Reparte las palabras de `text` en el intervalo [t0, t1]. */
export function distributeWords(words: string[], t0: number, t1: number): WordTiming[] {
  if (!words.length || t1 <= t0) return [];
  const ws = words.map(weight);
  const total = ws.reduce((a, w, i) => a + w.speak + (i < ws.length - 1 ? w.pause : 0), 0);
  const unit = (t1 - t0) / total;
  let t = t0;
  return words.map((text, i) => {
    const start = t;
    const end = t + ws[i].speak * unit;
    t = end + (i < ws.length - 1 ? ws[i].pause * unit : 0);
    return { text, start: round(start), end: round(end) };
  });
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export interface Silence {
  start: number;
  end: number;
}

/**
 * Estimación anclada a silencios: divide el texto en frases (puntuación), estima sus límites
 * y los "imanta" al silencio real más cercano (±0.9 s).
 */
export function estimateAlignment(text: string, duration: number, silences: Silence[] = []): WordTiming[] {
  const words = tokenize(text);
  if (!words.length) return [];
  let speechStart = 0;
  let speechEnd = duration;
  const lead = silences.find((s) => s.start <= 0.05);
  if (lead) speechStart = Math.min(lead.end, duration * 0.3);
  const tail = [...silences].reverse().find((s) => s.end >= duration - 0.05);
  if (tail) speechEnd = Math.max(tail.start, speechStart + duration * 0.5);
  const inner = silences.filter((s) => s.start > speechStart + 0.1 && s.end < speechEnd - 0.1);

  // Frases por puntuación.
  const phrases: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.!?…,;:]$/.test(w)) (phrases.push(cur), (cur = []));
  }
  if (cur.length) phrases.push(cur);

  const rough = distributeWords(words, speechStart, speechEnd);
  const used = new Set<number>();
  const bounds: { end: number; nextStart: number }[] = [];
  let idx = 0;
  for (let p = 0; p < phrases.length - 1; p++) {
    idx += phrases[p].length;
    const estEnd = rough[idx - 1].end;
    const estNext = rough[idx].start;
    const mid = (estEnd + estNext) / 2;
    let best = -1;
    let bestD = 0.9;
    inner.forEach((s, i) => {
      if (used.has(i)) return;
      const d = Math.abs((s.start + s.end) / 2 - mid);
      if (d < bestD) (best = i), (bestD = d);
    });
    if (best >= 0) {
      used.add(best);
      bounds.push({ end: inner[best].start, nextStart: inner[best].end });
    } else bounds.push({ end: estEnd, nextStart: estNext });
  }
  // Monotonía.
  const out: WordTiming[] = [];
  let t = speechStart;
  phrases.forEach((ph, p) => {
    const end = p < bounds.length ? Math.max(bounds[p].end, t + 0.15 * ph.length) : speechEnd;
    out.push(...distributeWords(ph, t, Math.min(end, speechEnd)));
    t = p < bounds.length ? Math.max(bounds[p].nextStart, end) : end;
  });
  return out;
}

/** ElevenLabs: arrays por carácter → palabras. */
export function wordsFromCharAlignment(a: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }): WordTiming[] {
  const out: WordTiming[] = [];
  let buf = "";
  let start = 0;
  let end = 0;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (buf) out.push({ text: buf, start: round(start), end: round(end) });
      buf = "";
      return;
    }
    if (!buf) start = a.character_start_times_seconds[i] ?? end;
    buf += ch;
    end = a.character_end_times_seconds[i] ?? start;
  });
  if (buf) out.push({ text: buf, start: round(start), end: round(end) });
  return out;
}

/** Parsea la salida de `ffmpeg -af silencedetect` (stderr). */
export function parseSilences(stderr: string): Silence[] {
  const out: Silence[] = [];
  let start: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && start !== null) {
      out.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  return out;
}
