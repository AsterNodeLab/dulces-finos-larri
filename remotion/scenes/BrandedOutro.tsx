/** Cierre de marca: emblema que se dibuja, firma, mensaje, CTA y handle. */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { SceneArea, alpha, bodyStyle, headlineStyle, monoStyle } from "../primitives/layout";
import { progress, staggerFrames, wave } from "../primitives/easing";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

export const BrandedOutro: React.FC<SceneComponentProps<"BrandedOutro">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = brand.colors;
  const [d1, d2, d3, d4] = staggerFrames(4, durationInFrames, 2, 0.6);
  const draw = progress(frame, d1, 24);
  const sig = progress(frame, d2, 14);
  const msg = progress(frame, d3, 14);
  const cta = progress(frame, d4, 14);
  const per = 4 * 150;
  return (
    <SceneArea style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      {/* Emblema: rombo facetado (eco del cristal) */}
      <svg width={220} height={220} viewBox="-110 -110 220 220" style={{ transform: `rotate(${wave(frame, fps, 10) * 3}deg)` }}>
        <polygon points="0,-100 100,0 0,100 -100,0" fill="none" stroke={c.accent} strokeWidth={2.5} strokeDasharray={per} strokeDashoffset={(1 - draw) * per} />
        <g opacity={progress(frame, d2, 14)}>
          <polygon points="0,-62 62,0 0,0" fill={alpha(c.accent, 0.55)} />
          <polygon points="0,-62 0,0 -62,0" fill={alpha(c.accent, 0.25)} />
          <polygon points="-62,0 0,0 0,62" fill={alpha(c.accent2, 0.4)} />
          <polygon points="0,0 62,0 0,62" fill={alpha(c.accent, 0.12)} />
        </g>
      </svg>
      <div style={{ ...headlineStyle(brand, 120), marginTop: 50, opacity: sig, transform: `translateY(${(1 - sig) * 20}px)` }}>{brand.signature}</div>
      <div style={{ ...monoStyle(c.accent2, 20), marginTop: 18, opacity: sig }}>{brand.tagline}</div>
      <div style={{ ...bodyStyle(brand, 42), color: alpha(c.text, 0.9), marginTop: 70, maxWidth: 760, opacity: msg, transform: `translateY(${(1 - msg) * 16}px)` }}>{props.message}</div>
      {props.cta ? (
        <div style={{ marginTop: 56, padding: "20px 40px", borderRadius: 999, border: `2px solid ${c.accent}`, fontFamily: fonts.sans, fontWeight: 600, fontSize: 32, color: c.accent, opacity: cta, transform: `scale(${0.92 + cta * 0.08})` }}>{props.cta}</div>
      ) : null}
      {props.handle ? <div style={{ ...monoStyle(c.textMuted, 24), marginTop: 36, textTransform: "none", opacity: cta }}>{props.handle}</div> : null}
    </SceneArea>
  );
};
