/** Fuentes: lista numerada con título, medio, fecha y URL acortada. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { Eyebrow, SceneArea, alpha, bodyStyle, headlineStyle, monoStyle } from "../primitives/layout";
import { progress, revealDeadline, staggerFrames } from "../primitives/easing";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

/** "https://www.ejemplo.com/a/b/c?x=1" → "ejemplo.com/a/b…" (sin depender de URL() por si es inválida). */
export function shortenUrl(url: string, max = 38): string {
  const noProto = url.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  return noProto.length > max ? `${noProto.slice(0, max - 1)}…` : noProto;
}

export const SourceAttribution: React.FC<SceneComponentProps<"SourceAttribution">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const at = staggerFrames(props.sources.length, durationInFrames, 18, 0.55);
  const noteIn = progress(frame, Math.min(at[at.length - 1] + 8, revealDeadline(durationInFrames)), 14);
  return (
    <SceneArea>
      <Eyebrow text="Fuentes" brand={brand} />
      <div style={{ ...headlineStyle(brand, 64), marginTop: 30, opacity: progress(frame, 6, 18) }}>De dónde sale esto</div>
      <div style={{ marginTop: 50, display: "flex", flexDirection: "column" }}>
        {props.sources.map((s, i) => {
          const p = progress(frame, at[i], 18);
          return (
            <div key={i} style={{ display: "flex", gap: 26, padding: "36px 0", borderTop: `1px solid ${c.line}`, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
              <div style={{ ...monoStyle(c.accent, 24), width: 48, paddingTop: 4 }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 38, lineHeight: 1.2, color: c.text }}>{s.title}</div>
                <div style={{ ...monoStyle(c.textMuted, 18), marginTop: 10 }}>
                  {s.publisher}
                  {s.date ? ` · ${s.date}` : ""}
                </div>
                {s.url ? <div style={{ ...monoStyle(alpha(c.accent, 0.85), 18), textTransform: "none", letterSpacing: "0.02em", marginTop: 6 }}>{shortenUrl(s.url)}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      {props.note ? <div style={{ ...bodyStyle(brand, 26), marginTop: "auto", paddingTop: 24, borderTop: `1px solid ${c.line}`, opacity: noteIn }}>{props.note}</div> : null}
    </SceneArea>
  );
};
