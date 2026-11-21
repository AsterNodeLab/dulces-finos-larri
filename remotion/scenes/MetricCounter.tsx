/** Contador de métrica: número grande que cuenta con easing, contexto y fuente. */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, SceneArea, alpha, bodyStyle, headlineStyle, monoStyle } from "../primitives/layout";
import { easeInOut, progress, revealDeadline } from "../primitives/easing";
import type { SceneComponentProps } from "./types";

function formatNumber(v: number, decimals: number): string {
  // Formato es-MX: separador de miles "," y decimal ".". Implementación propia para no depender de ICU del navegador.
  const fixed = Math.abs(v).toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${v < 0 ? "−" : ""}${grouped}${dec ? `.${dec}` : ""}`;
}

export const MetricCounter: React.FC<SceneComponentProps<"MetricCounter">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const dl = revealDeadline(durationInFrames);
  const countEnd = Math.max(Math.min(12, dl), Math.min(Math.round(durationInFrames * 0.55), dl - 4));
  const t = interpolate(frame, [Math.min(10, countEnd - 1), countEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const text = `${props.prefix ?? ""}${formatNumber(props.value * t, props.decimals)}`;
  const finalLen = `${props.prefix ?? ""}${formatNumber(props.value, props.decimals)}`.length + (props.suffix?.length ?? 0);
  const size = finalLen > 9 ? 150 : finalLen > 6 ? 190 : 240;
  const ctx = progress(frame, Math.max(0, countEnd - 10), 14);
  const src = progress(frame, Math.min(countEnd + 4, dl), 14);
  return (
    <SceneArea style={{ justifyContent: "center" }}>
      <Eyebrow text={props.label} brand={brand} />
      <div style={{ marginTop: 40, display: "flex", alignItems: "baseline", gap: 12, ...headlineStyle(brand, size), fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em" }}>
        <span>{text}</span>
        {props.suffix ? <span style={{ color: c.accent, fontSize: size * 0.42, letterSpacing: "-0.01em" }}>{props.suffix}</span> : null}
      </div>
      {/* Barra de progreso del conteo */}
      <div style={{ marginTop: 30, height: 2, width: "100%", background: c.line }}>
        <div style={{ height: 2, width: `${t * 100}%`, background: c.accent }} />
      </div>
      {props.context ? <div style={{ ...bodyStyle(brand, 40), color: alpha(c.text, 0.85), marginTop: 44, maxWidth: 780, opacity: ctx, transform: `translateY(${(1 - ctx) * 16}px)` }}>{props.context}</div> : null}
      {props.source ? (
        <div style={{ marginTop: 40, ...monoStyle(c.textMuted, 19), textTransform: "none", letterSpacing: "0.04em", opacity: src }}>Fuente · {props.source}</div>
      ) : null}
    </SceneArea>
  );
};
