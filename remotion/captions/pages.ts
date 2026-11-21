/**
 * Paginación de subtítulos. TS puro (sin React/DOM): lo reutiliza la app.
 * Reglas: páginas de ≤ 2 líneas; ninguna línea supera maxCharsPerLine (salvo una palabra
 * que por sí sola sea más larga); nueva página tras puntuación final o pausa > 0.35 s;
 * una coma con la línea ya medio llena fuerza salto de línea.
 */
import type { WordTiming } from "../../src/shared/schema";

export interface CaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionPage {
  lines: CaptionWord[][];
  startFrame: number;
  /** Exclusivo. */
  endFrame: number;
}

export const PAUSE_SECONDS = 0.35;
const HOLD_SECONDS = 0.6; // la última página de una frase se mantiene un instante

const lineLength = (line: CaptionWord[]) => line.reduce((acc, w, i) => acc + w.text.length + (i > 0 ? 1 : 0), 0);

export function buildCaptionPages(words: WordTiming[], maxCharsPerLine: number, fps: number): CaptionPage[] {
  const sorted = words.filter((w) => w.text.trim().length > 0).slice().sort((a, b) => a.start - b.start);
  const pages: CaptionPage[] = [];
  let lines: CaptionWord[][] = [[]];
  let lastEndSec = -1;

  const flush = () => {
    const filled = lines.filter((l) => l.length > 0);
    if (filled.length === 0) return;
    const first = filled[0][0];
    const lastLine = filled[filled.length - 1];
    const last = lastLine[lastLine.length - 1];
    pages.push({ lines: filled, startFrame: first.startFrame, endFrame: Math.max(last.endFrame, first.startFrame + 1) });
    lines = [[]];
  };

  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
    const text = w.text.trim();
    const word: CaptionWord = {
      text,
      startFrame: Math.round(w.start * fps),
      endFrame: Math.max(Math.round(w.start * fps) + 1, Math.round(Math.max(w.end, w.start) * fps)),
    };
    if (lastEndSec >= 0 && w.start - lastEndSec > PAUSE_SECONDS) flush();

    let current = lines[lines.length - 1];
    const tentative = lineLength(current) + (current.length > 0 ? 1 : 0) + text.length;
    if (current.length > 0 && tentative > maxCharsPerLine) {
      if (lines.length >= 2) flush();
      else lines.push([]);
      current = lines[lines.length - 1];
    }
    current.push(word);
    lastEndSec = Math.max(w.end, w.start);

    if (/[.!?…]["»”']?$/.test(text)) {
      flush();
    } else if (/[,;:]["»”']?$/.test(text) && lineLength(current) >= maxCharsPerLine * 0.5) {
      if (lines.length >= 2) flush();
      else lines.push([]);
    }
  }
  flush();

  // Mantener cada página visible hasta la siguiente (sin huecos cortos) o un breve "hold".
  const hold = Math.round(HOLD_SECONDS * fps);
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    const extended = pages[i].endFrame + hold;
    pages[i].endFrame = next ? Math.min(extended, next.startFrame) : extended;
    if (next && next.startFrame - pages[i].endFrame < Math.round(0.25 * fps)) pages[i].endFrame = next.startFrame;
  }
  return pages;
}

/** Normaliza para comparar palabras clave: sin acentos, minúsculas, sin puntuación. */
export function normalizeWord(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
