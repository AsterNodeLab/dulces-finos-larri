/** Portadilla editorial: eyebrow, regla que se dibuja, titular grande y subtítulo. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { Eyebrow, SceneArea, alpha, bodyStyle, headlineStyle, monoStyle } from "../primitives/layout";
import { progress, fitSpan, revealDeadline } from "../primitives/easing";
import { WordReveal, tokenize } from "../primitives/Reveal";
import type { SceneComponentProps } from "./types";

export const EditorialTitle: React.FC<SceneComponentProps<"EditorialTitle">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const tokens = tokenize(props.title);
  const [ws, span] = fitSpan(durationInFrames, 12, Math.min(durationInFrames * 0.3, 6 + tokens.length * 4));
  const rule = progress(frame, 8, 26);
  const sub = progress(frame, Math.min(ws + span + 6, revealDeadline(durationInFrames)), 14);
  const size = props.title.length > 50 ? 96 : 118;
  return (
    <SceneArea style={{ justifyContent: "center" }}>
      <div style={{ position: "absolute", left: 0, top: 40, ...monoStyle(alpha(c.text, 0.35), 20) }}>
        <span style={{ opacity: rule }}>— {brand.name} · Explicado</span>
      </div>
      <div style={{ display: "flex", gap: 36 }}>
        <div style={{ width: 3, background: c.accent, transform: `scaleY(${rule})`, transformOrigin: "top" }} />
        <div style={{ flex: 1 }}>
          {props.eyebrow ? <Eyebrow text={props.eyebrow} brand={brand} color={c.accent2} /> : null}
          <WordReveal tokens={tokens} startFrame={ws} spanFrames={span} style={{ ...headlineStyle(brand, size), marginTop: 36 }} />
          {props.subtitle ? (
            <div style={{ ...bodyStyle(brand, 40), marginTop: 44, maxWidth: 760, opacity: sub, transform: `translateY(${(1 - sub) * 18}px)` }}>{props.subtitle}</div>
          ) : null}
        </div>
      </div>
    </SceneArea>
  );
};
