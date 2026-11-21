/**
 * Fondo de marca programático: retícula fina + líneas de contorno que derivan lento.
 * Sin desenfoques ni degradados morados; solo transform/opacity (barato en GPU integrada).
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandProfile } from "../../src/shared/brands";
import { alpha } from "./layout";

const GRID = 72;

function contourPath(i: number, width: number, height: number): string {
  // Curvas suaves deterministas (sin random) a modo de curvas de nivel.
  const baseY = height * (0.18 + i * 0.13);
  const amp = 40 + i * 9;
  const pts: string[] = [];
  for (let x = -100; x <= width + 100; x += 60) {
    const y = baseY + Math.sin(x / (180 + i * 30) + i * 1.7) * amp + Math.sin(x / 90 + i) * 8;
    pts.push(`${x === -100 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export const Background: React.FC<{ brand: BrandProfile }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const drift = (t * 6) % GRID; // la retícula avanza 6 px/s y se repite sin saltos
  const accent = brand.colors.accent;
  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background, overflow: "hidden" }}>
      {/* Luz ambiental muy tenue, en el color de superficie (no blur). */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 70% at 20% 0%, ${brand.colors.surfaceRaised} 0%, ${brand.colors.background} 60%)`,
          opacity: 0.9,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="vq-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke={brand.colors.line} strokeWidth={1} />
          </pattern>
          <linearGradient id="vq-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0.25} />
            <stop offset="1" stopColor="#fff" stopOpacity={0.05} />
          </linearGradient>
          <mask id="vq-mask">
            <rect width={width} height={height} fill="url(#vq-fade)" />
          </mask>
        </defs>
        <g mask="url(#vq-mask)">
          <rect x={-GRID} y={-GRID} width={width + GRID * 2} height={height + GRID * 2} fill="url(#vq-grid)" transform={`translate(${drift * 0.5}, ${drift})`} />
        </g>
        <g transform={`translate(${Math.sin(t / 7) * 30}, ${Math.sin(t / 9) * 18})`} fill="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={contourPath(i, width, height)} stroke={alpha(accent, i % 2 === 0 ? 0.07 : 0.045)} strokeWidth={1.2} />
          ))}
        </g>
        {/* Marcas de registro editoriales en las esquinas del área segura. */}
        {[
          [72, 150],
          [width - 160, 150],
        ].map(([x, y], i) => (
          <g key={i} stroke={alpha(accent, 0.35)} strokeWidth={1.5}>
            <line x1={x - 10} y1={y} x2={x + 10} y2={y} />
            <line x1={x} y1={y - 10} x2={x} y2={y + 10} />
          </g>
        ))}
      </svg>
      {/* Viñeta para dar profundidad sin blur. */}
      <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% 45%, transparent 55%, ${alpha(brand.colors.background.length === 7 ? brand.colors.background : "#000000", 0.85)} 100%)` }} />
    </AbsoluteFill>
  );
};
