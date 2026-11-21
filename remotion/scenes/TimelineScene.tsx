/** Línea de tiempo vertical que se dibuja; cada evento aparece cuando la línea lo alcanza. */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { SceneArea, SceneTitle, alpha, monoStyle } from "../primitives/layout";
import { easeInOut, progress, staggerFrames } from "../primitives/easing";
import { usePop } from "../primitives/Reveal";
import { fonts } from "../../src/shared/tokens";
import type { BrandProfile } from "../../src/shared/brands";
import type { SceneComponentProps } from "./types";

const LINE_X = 40;

const Dot: React.FC<{ y: number; at: number; brand: BrandProfile; last: boolean }> = ({ y, at, brand, last }) => {
  const pop = usePop(at, 11);
  return (
    <div style={{ position: "absolute", left: LINE_X - 13, top: y - 13, width: 26, height: 26, borderRadius: 13, background: last ? brand.colors.accent2 : brand.colors.background, border: `3px solid ${last ? brand.colors.accent2 : brand.colors.accent}`, transform: `scale(${pop})` }} />
  );
};

export const TimelineScene: React.FC<SceneComponentProps<"TimelineScene">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const n = props.events.length;
  const at = staggerFrames(n, durationInFrames, 20, 0.7);
  const h = 820;
  const gap = Math.min(260, (h - 60) / Math.max(1, n - 1));
  const ys = props.events.map((_, i) => 30 + i * gap);
  // La línea crece hasta cada evento justo cuando éste aparece.
  const lineY = interpolate(frame, [at[0] - 8, ...at.slice(1)], [ys[0], ...ys.slice(1)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return (
    <SceneArea>
      <SceneTitle text={props.title} brand={brand} size={68} />
      <div style={{ position: "relative", marginTop: 90, height: h }}>
        <div style={{ position: "absolute", left: LINE_X - 1, top: ys[0], width: 2, height: ys[n - 1] - ys[0], background: c.line }} />
        <div style={{ position: "absolute", left: LINE_X - 1.5, top: ys[0], width: 3, height: Math.max(0, lineY - ys[0]), background: c.accent }} />
        {props.events.map((e, i) => {
          const p = progress(frame, at[i], 18);
          return (
            <React.Fragment key={i}>
              <Dot y={ys[i]} at={at[i]} brand={brand} last={i === n - 1} />
              <div style={{ position: "absolute", left: LINE_X + 54, top: ys[i] - 20, right: 0, opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
                <div style={monoStyle(i === n - 1 ? c.accent2 : c.accent, 26)}>{e.date}</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 44, lineHeight: 1.2, color: alpha(c.text, 0.92), marginTop: 8 }}>{e.label}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </SceneArea>
  );
};
