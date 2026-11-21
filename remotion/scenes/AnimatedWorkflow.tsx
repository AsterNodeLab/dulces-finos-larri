/**
 * Flujo de trabajo: pasos verticales que se encienden uno por uno a lo largo de la escena.
 * El conector se dibuja hasta el paso activo y un paquete de datos viaja por él.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CONTENT, SceneArea, SceneTitle, alpha, monoStyle } from "../primitives/layout";
import { easeInOut, progress, revealDeadline, staggerFrames } from "../primitives/easing";
import { usePop } from "../primitives/Reveal";
import { IconGlyph } from "../primitives/Icon";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

const NODE_X = 70;
const R = 46;

export const AnimatedWorkflow: React.FC<SceneComponentProps<"AnimatedWorkflow">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const n = props.steps.length;
  const canvasH = 760;
  const gap = Math.min(270, (canvasH - 2 * R) / Math.max(1, n - 1));
  const ys = props.steps.map((_, i) => R + 10 + i * gap);
  const at = staggerFrames(n, durationInFrames, 20, props.loop ? 0.6 : 0.7);
  const W = CONTENT.width;

  // Paquete: viaja del paso i al i+1 justo antes de que se encienda el siguiente.
  let packetY = -1;
  for (let i = 0; i < n - 1; i++) {
    const t = interpolate(frame, [at[i] + 4, at[i + 1]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
    if (t > 0 && t < 1) packetY = ys[i] + R + (ys[i + 1] - ys[i] - 2 * R) * t;
  }
  const loopAt = Math.min(at[n - 1] + 8, revealDeadline(durationInFrames));
  const loopP = props.loop ? progress(frame, loopAt, 14) : 0;
  const loopPath = `M ${NODE_X - R - 6} ${ys[n - 1]} C -24 ${ys[n - 1]}, -24 ${ys[0]}, ${NODE_X - R - 6} ${ys[0]}`;
  const loopLen = 1.4 * (ys[n - 1] - ys[0]) + 120;

  return (
    <SceneArea>
      <SceneTitle text={props.title} brand={brand} size={66} />
      <div style={{ position: "absolute", left: 0, top: 220, height: canvasH, width: W }}>
        <svg width={W} height={canvasH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {ys.slice(0, -1).map((y, i) => {
            const len = ys[i + 1] - y - 2 * R;
            const d = progress(frame, at[i] + 4, Math.max(8, at[i + 1] - at[i] - 4), easeInOut);
            return (
              <g key={i}>
                <line x1={NODE_X} y1={y + R} x2={NODE_X} y2={ys[i + 1] - R} stroke={c.line} strokeWidth={2} />
                <line x1={NODE_X} y1={y + R} x2={NODE_X} y2={ys[i + 1] - R} stroke={c.accent} strokeWidth={3} strokeDasharray={len} strokeDashoffset={(1 - d) * len} />
              </g>
            );
          })}
          {props.loop ? <path d={loopPath} fill="none" stroke={alpha(c.accent2, 0.7)} strokeWidth={2} strokeDasharray={`${loopLen}`} strokeDashoffset={(1 - loopP) * loopLen} /> : null}
          {packetY >= 0 ? <circle cx={NODE_X} cy={packetY} r={9} fill={c.accent2} /> : null}
          {props.steps.map((s, i) => (
            <StepNode key={i} y={ys[i]} at={at[i]} icon={s.icon} index={i} accent={c.accent} surface={c.surface} line={c.line} text={c.text} />
          ))}
        </svg>
        {props.steps.map((s, i) => {
          const p = progress(frame, at[i], 16);
          const active = frame >= at[i] && (i === n - 1 || frame < at[i + 1]);
          return (
            <div key={i} style={{ position: "absolute", left: NODE_X + R + 36, top: ys[i] - 44, width: W - NODE_X - R - 60, opacity: 0.25 + p * 0.75, transform: `translateX(${(1 - p) * 20}px)` }}>
              <div style={monoStyle(active ? c.accent : alpha(c.text, 0.45), 18)}>
                Paso {i + 1}
                {s.tool ? ` · ${s.tool}` : ""}
              </div>
              <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 48, color: c.text, marginTop: 8, lineHeight: 1.1 }}>{s.label}</div>
            </div>
          );
        })}
        {props.loop ? (
          <div style={{ position: "absolute", left: NODE_X + R + 36, top: ys[n - 1] + 64, ...monoStyle(c.accent2, 18), opacity: loopP }}>↻ Se repite el ciclo</div>
        ) : null}
      </div>
    </SceneArea>
  );
};

const StepNode: React.FC<{ y: number; at: number; icon?: Parameters<typeof IconGlyph>[0]["name"]; index: number; accent: string; surface: string; line: string; text: string }> = ({ y, at, icon, index, accent, surface, line, text }) => {
  const pop = usePop(at);
  const lit = Math.min(1, pop);
  return (
    <g>
      <circle cx={NODE_X} cy={y} r={R} fill={surface} stroke={line} strokeWidth={2} />
      <g transform={`translate(${NODE_X}, ${y}) scale(${0.6 + pop * 0.4}) translate(${-NODE_X}, ${-y})`} opacity={lit}>
        <circle cx={NODE_X} cy={y} r={R} fill={surface} stroke={accent} strokeWidth={2.5} />
        <circle cx={NODE_X} cy={y} r={R + 12} fill="none" stroke={accent} strokeOpacity={0.25} strokeWidth={1} />
        {icon ? (
          <IconGlyph name={icon} x={NODE_X} y={y} size={40} color={accent} />
        ) : (
          <text x={NODE_X} y={y + 10} textAnchor="middle" fontFamily="'JetBrains Mono Variable', monospace" fontSize={28} fill={text}>
            {index + 1}
          </text>
        )}
      </g>
    </g>
  );
};
