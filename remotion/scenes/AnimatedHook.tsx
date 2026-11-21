/** Hook inicial: visual programático arriba y titular que se revela palabra por palabra. */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CONTENT, Eyebrow, SceneArea, alpha, headlineStyle } from "../primitives/layout";
import { fitSpan, progress, wave } from "../primitives/easing";
import { WordReveal, tokenize } from "../primitives/Reveal";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

const VIS_W = CONTENT.width;
const VIS_H = 520;

const PulseGrid: React.FC<{ color: string; muted: string }> = ({ color, muted }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = 11;
  const rows = 7;
  const gap = VIS_W / cols;
  const cx = VIS_W / 2;
  const cy = VIS_H / 2;
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gap / 2 + c * gap;
      const y = 40 + r * ((VIS_H - 80) / (rows - 1));
      const d = Math.hypot(x - cx, y - cy);
      const appear = progress(frame, 4 + d / 26, 14);
      const pulse = (wave(frame - d / 9, fps, 1.8) + 1) / 2; // onda que sale del centro
      const hot = d < 90;
      dots.push(
        <circle key={`${r}-${c}`} cx={x} cy={y} r={(hot ? 6 : 3.4) + pulse * 2.4} fill={hot ? color : muted} opacity={appear * (0.25 + pulse * 0.6)} />,
      );
    }
  }
  const ring = (frame % (fps * 1.8)) / (fps * 1.8);
  return (
    <svg width={VIS_W} height={VIS_H}>
      {dots}
      <circle cx={cx} cy={cy} r={30 + ring * 260} fill="none" stroke={color} strokeWidth={1.5} opacity={(1 - ring) * 0.5} />
      <circle cx={cx} cy={cy} r={18} fill={color} />
    </svg>
  );
};

const Orbit: React.FC<{ color: string; color2: string; line: string }> = ({ color, color2, line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cx = VIS_W / 2;
  const cy = VIS_H / 2;
  const rings = [110, 180, 250];
  return (
    <svg width={VIS_W} height={VIS_H}>
      {rings.map((r, i) => {
        const p = progress(frame, 4 + i * 6, 24);
        const a = (frame / fps) * (0.9 - i * 0.22) + i * 2.1;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={r * 1.25} ry={r * 0.72} fill="none" stroke={line} strokeWidth={1.5} strokeDasharray={2 * Math.PI * r} strokeDashoffset={(1 - p) * 2 * Math.PI * r} />
            <circle cx={cx + Math.cos(a) * r * 1.25} cy={cy + Math.sin(a) * r * 0.72} r={9 - i * 1.5} fill={i === 1 ? color2 : color} opacity={p} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={40} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={14} fill={color} />
    </svg>
  );
};

const Question: React.FC<{ color: string; line: string }> = ({ color, line }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, 4, 34);
  const len = 900;
  return (
    <svg width={VIS_W} height={VIS_H} viewBox={`0 0 ${VIS_W} ${VIS_H}`}>
      <circle cx={VIS_W / 2} cy={VIS_H / 2} r={230} fill="none" stroke={line} strokeWidth={1.5} />
      <path
        d={`M ${VIS_W / 2 - 90} ${VIS_H / 2 - 80} C ${VIS_W / 2 - 90} ${VIS_H / 2 - 190}, ${VIS_W / 2 + 110} ${VIS_H / 2 - 190}, ${VIS_W / 2 + 100} ${VIS_H / 2 - 70} C ${VIS_W / 2 + 92} ${VIS_H / 2 + 10}, ${VIS_W / 2} ${VIS_H / 2 + 10}, ${VIS_W / 2} ${VIS_H / 2 + 90}`}
        fill="none"
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={(1 - p) * len}
      />
      <circle cx={VIS_W / 2} cy={VIS_H / 2 + 160} r={16} fill={color} opacity={progress(frame, 34, 8)} />
    </svg>
  );
};

export const AnimatedHook: React.FC<SceneComponentProps<"AnimatedHook">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const tokens = tokenize(props.headline, props.highlight);
  const [ws, span] = fitSpan(durationInFrames, 12, Math.min(durationInFrames * 0.35, 8 + tokens.length * 4));
  const size = props.headline.length > 60 ? 84 : props.headline.length > 36 ? 100 : 120;
  const underline = progress(frame, ws + span, 14);
  const c = brand.colors;
  return (
    <SceneArea>
      {props.kicker ? <Eyebrow text={props.kicker} brand={brand} /> : <div style={{ height: 32 }} />}
      <div style={{ marginTop: 40, height: VIS_H }}>
        {props.visual === "orbit" ? (
          <Orbit color={c.accent} color2={c.accent2} line={c.line} />
        ) : props.visual === "question" ? (
          <Question color={c.accent} line={c.line} />
        ) : (
          <PulseGrid color={c.accent} muted={c.textMuted} />
        )}
      </div>
      <div style={{ marginTop: "auto", position: "relative" }}>
        <WordReveal tokens={tokens} startFrame={ws} spanFrames={span} highlightColor={c.accent} style={headlineStyle(brand, size)} />
        <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ height: 3, width: 260 * underline, background: c.accent2 }} />
          <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: "0.2em", color: alpha(c.text, 0.5), opacity: underline }}>{brand.name.toUpperCase()}</div>
        </div>
      </div>
    </SceneArea>
  );
};
