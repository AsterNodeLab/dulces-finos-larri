/** Indicador de atención: flecha/trazo del lado del presentador que "señala" el panel. */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandProfile } from "../../src/shared/brands";
import { progress, wave } from "./easing";

export const Pointer: React.FC<{ brand: BrandProfile; at: number; side: "left" | "right" }> = ({ brand, at, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = progress(frame, at, 18);
  const nudge = wave(frame, fps, 1.6) * 6 * p;
  const flip = side === "left" ? -1 : 1;
  return (
    <svg
      width={140}
      height={60}
      style={{ position: "absolute", top: 120, [side === "right" ? "right" : "left"]: -150, transform: `translateX(${nudge * -flip}px) scaleX(${flip})`, opacity: p }}
    >
      {/* Apunta hacia la izquierda (hacia el panel) cuando el presentador está a la derecha */}
      <path d="M130 30 H 22" stroke={brand.colors.accent2} strokeWidth={3} strokeDasharray={110} strokeDashoffset={(1 - p) * 110} />
      <path d="M40 14 L 20 30 L 40 46" fill="none" stroke={brand.colors.accent2} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Resaltado tipo marcador detrás de un bloque (rect que crece de izquierda a derecha). */
export const Highlight: React.FC<{ color: string; at: number; width: number; height: number; style?: React.CSSProperties }> = ({ color, at, width, height, style }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 16);
  return <div style={{ position: "absolute", width: width * p, height, background: color, ...style }} />;
};
