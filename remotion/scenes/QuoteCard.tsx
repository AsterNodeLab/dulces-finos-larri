/** Cita editorial: comillas grandes, texto en Fraunces itálica revelado por palabras, autor y fuente. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { SceneArea, alpha, headlineStyle, monoStyle } from "../primitives/layout";
import { fitSpan, progress, revealDeadline } from "../primitives/easing";
import { WordReveal, tokenize } from "../primitives/Reveal";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

export const QuoteCard: React.FC<SceneComponentProps<"QuoteCard">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const tokens = tokenize(props.quote);
  const [ws, span] = fitSpan(durationInFrames, 10, Math.min(durationInFrames * 0.5, 8 + tokens.length * 3));
  const mark = progress(frame, 0, 20);
  const author = progress(frame, Math.min(ws + span + 6, revealDeadline(durationInFrames)), 14);
  const size = props.quote.length > 150 ? 54 : props.quote.length > 90 ? 64 : 76;
  return (
    <SceneArea style={{ justifyContent: "center" }}>
      <div style={{ fontFamily: fonts.serif, fontSize: 300, lineHeight: 0.6, height: 150, color: c.accent2, opacity: mark, transform: `translateY(${(1 - mark) * 30}px)` }}>“</div>
      <WordReveal tokens={tokens} startFrame={ws} spanFrames={span} style={{ ...headlineStyle(brand, size), fontStyle: "italic", lineHeight: 1.14, marginTop: 20 }} />
      <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 22, opacity: author, transform: `translateY(${(1 - author) * 14}px)` }}>
        <div style={{ width: 48, height: 2, background: c.accent2 }} />
        <div>
          <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 34, color: c.text }}>{props.author}</div>
          {props.role ? <div style={{ fontFamily: fonts.sans, fontSize: 34, color: c.textMuted, marginTop: 4 }}>{props.role}</div> : null}
        </div>
      </div>
      {props.source ? <div style={{ marginTop: 34, ...monoStyle(alpha(c.text, 0.5), 18), textTransform: "none", letterSpacing: "0.04em", opacity: author }}>Fuente · {props.source}</div> : null}
    </SceneArea>
  );
};
