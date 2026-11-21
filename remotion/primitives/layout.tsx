/**
 * Layout y tipografía editorial compartidos por las escenas.
 * Área de contenido: dentro de las zonas seguras y libre de la banda de subtítulos
 * (x ∈ [72, 920], y ∈ [220, 1300] en 1080x1920).
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import type { BrandProfile } from "../../src/shared/brands";
import { fonts, videoFormat } from "../../src/shared/tokens";
import { progress } from "./easing";

export const SAFE = videoFormat.safe;
export const CONTENT = {
  left: SAFE.left,
  right: videoFormat.width - SAFE.right,
  top: 250,
  bottom: 1290,
  get width() {
    return this.right - this.left;
  },
  get height() {
    return this.bottom - this.top;
  },
};

/** Contenedor absoluto del área de contenido de la escena. */
export const SceneArea: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      left: CONTENT.left,
      top: CONTENT.top,
      width: CONTENT.width,
      height: CONTENT.height,
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Etiqueta mono en mayúsculas con regla de acento que se dibuja. */
export const Eyebrow: React.FC<{ text: string; brand: BrandProfile; at?: number; color?: string }> = ({ text, brand, at = 4, color }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 16);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: Math.min(1, p * 1.4) }}>
      <div style={{ width: 56 * p, height: 2, background: color ?? brand.colors.accent }} />
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: color ?? brand.colors.accent,
          transform: `translateX(${(1 - p) * -12}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const headlineStyle = (brand: BrandProfile, size: number): React.CSSProperties => ({
  fontFamily: fonts.serif,
  fontSize: size,
  fontWeight: 400,
  lineHeight: 1.02,
  letterSpacing: "-0.025em",
  color: brand.colors.text,
  fontVariationSettings: '"opsz" 144',
  textWrap: "balance",
});

/** Texto de cuerpo: mínimo 34 px para legibilidad en teléfono. */
export const bodyStyle = (brand: BrandProfile, size = 34): React.CSSProperties => ({
  fontFamily: fonts.sans,
  fontSize: Math.max(34, size),
  fontWeight: 400,
  lineHeight: 1.35,
  color: brand.colors.textMuted,
});

/** Etiquetas mono: mínimo 24 px. */
export const monoStyle = (color: string, size = 24): React.CSSProperties => ({
  fontFamily: fonts.mono,
  fontSize: Math.max(24, size),
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color,
});

/** Título de escena estándar (Fraunces) con aparición. */
export const SceneTitle: React.FC<{ text: string; brand: BrandProfile; size?: number; at?: number }> = ({ text, brand, size = 72, at = 6 }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 20);
  return (
    <div style={{ ...headlineStyle(brand, size), opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{text}</div>
  );
};

/** Convierte "#RRGGBB" a rgba con alfa. Solo para colores del contrato. */
export function alpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
