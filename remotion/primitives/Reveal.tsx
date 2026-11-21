/** Revelados reutilizables: aparición con desplazamiento y textos palabra por palabra. */
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "./easing";

export const Reveal: React.FC<{
  at: number;
  length?: number;
  dy?: number;
  dx?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, length = 18, dy = 28, dx = 0, style, children }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, length);
  return (
    <div style={{ opacity: p, transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`, ...style }}>{children}</div>
  );
};

/** Spring de "pop" para nodos (0→1, con ligero rebote). */
export function usePop(at: number, damping = 13): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 140, mass: 0.7 } });
}

export interface WordToken {
  text: string;
  highlight?: boolean;
}

/** Texto que aparece palabra por palabra, entre startFrame y startFrame + spanFrames. */
export const WordReveal: React.FC<{
  tokens: WordToken[];
  startFrame: number;
  spanFrames: number;
  highlightColor?: string;
  /** Duración de la animación de cada palabra. */
  wordFrames?: number;
  style?: React.CSSProperties;
}> = ({ tokens, startFrame, spanFrames, highlightColor, wordFrames = 14, style }) => {
  const frame = useCurrentFrame();
  const step = tokens.length > 1 ? spanFrames / (tokens.length - 1) : 0;
  return (
    <div style={style}>
      {tokens.map((t, i) => {
        const p = progress(frame, startFrame + i * step, wordFrames);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 0.35}em)`,
              color: t.highlight && highlightColor ? highlightColor : undefined,
              whiteSpace: "pre",
            }}
          >
            {t.text}
            {i < tokens.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};

/** Divide un texto en tokens y marca los que pertenecen a la frase resaltada. */
export function tokenize(text: string, highlight?: string): WordToken[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!highlight) return words.map((w) => ({ text: w }));
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const target = highlight.split(/\s+/).filter(Boolean).map(norm);
  const flags = new Array(words.length).fill(false);
  const nw = words.map(norm);
  for (let i = 0; i + target.length <= nw.length; i++) {
    if (target.every((t, j) => nw[i + j] === t)) {
      for (let j = 0; j < target.length; j++) flags[i + j] = true;
      break;
    }
  }
  return words.map((w, i) => ({ text: w, highlight: flags[i] }));
}
