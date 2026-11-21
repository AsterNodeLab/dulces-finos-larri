/** Exportación SRT usando la MISMA paginación que el video (remotion/captions/pages.ts). */
import { buildCaptionPages } from "../../../remotion/captions/pages";
import type { VideoSpec } from "@/shared/schema";

function ts(frames: number, fps: number): string {
  const ms = Math.max(0, Math.round((frames / fps) * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

export function buildSrt(spec: VideoSpec): string {
  const pages = buildCaptionPages(spec.captions.words, spec.captions.maxCharsPerLine, spec.fps);
  return (
    pages
      .map((pg, i) => `${i + 1}\n${ts(pg.startFrame, spec.fps)} --> ${ts(pg.endFrame, spec.fps)}\n${pg.lines.map((l) => l.map((w) => w.text).join(" ")).join("\n")}\n`)
      .join("\n") + "\n"
  );
}
