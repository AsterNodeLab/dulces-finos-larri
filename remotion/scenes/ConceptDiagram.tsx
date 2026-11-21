/**
 * Diagrama conceptual: un concepto central y nodos conectados. Los conectores se dibujan
 * (stroke-dashoffset), los nodos aparecen con spring uno por uno a lo largo de la escena,
 * y un "paquete" de datos recorre cada conector ya revelado.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CONTENT, SceneArea, SceneTitle, alpha, monoStyle } from "../primitives/layout";
import { progress, staggerFrames } from "../primitives/easing";
import { usePop } from "../primitives/Reveal";
import { Icon } from "../primitives/Icon";
import { fonts } from "../../src/shared/tokens";
import type { BrandProfile } from "../../src/shared/brands";
import type { ScenePropsOf } from "../../src/shared/schema";
import type { SceneComponentProps } from "./types";

type Node = ScenePropsOf<"ConceptDiagram">["nodes"][number];
const W = CONTENT.width;
const H = 900; // lienzo radial: y ≈ 330..1250 en pantalla
const CANVAS_TOP = 50;

const NodeCard: React.FC<{ node: Node; brand: BrandProfile; at: number; index: number; width: number; style?: React.CSSProperties; centerY?: boolean }> = ({ node, brand, at, index, width, style, centerY }) => {
  const pop = usePop(at);
  const c = brand.colors;
  return (
    <div
      style={{
        position: "absolute",
        width,
        padding: "22px 24px",
        background: c.surface,
        border: `1.5px solid ${alpha(c.accent, 0.4)}`,
        borderRadius: 16,
        opacity: Math.min(1, pop * 1.5),
        transform: `${centerY ? "translateY(-50%) " : ""}scale(${0.7 + pop * 0.3})`,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {node.icon ? <Icon name={node.icon} size={42} color={c.accent} /> : null}
        <div style={monoStyle(alpha(c.text, 0.5), 24)}>{String(index + 1).padStart(2, "0")}</div>
      </div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 36, lineHeight: 1.12, color: c.text, marginTop: 12 }}>{node.label}</div>
      {node.detail ? <div style={{ fontFamily: fonts.sans, fontSize: 28, lineHeight: 1.25, color: c.textMuted, marginTop: 8 }}>{node.detail}</div> : null}
    </div>
  );
};

export const ConceptDiagram: React.FC<SceneComponentProps<"ConceptDiagram">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = brand.colors;
  const n = props.nodes.length;
  const at = staggerFrames(n, durationInFrames, 10, 0.66);
  const centerPop = usePop(0, 16); // el centro aparece en los primeros ~8 frames

  if (props.layout === "stack") {
    const rowH = (H - 140) / n;
    const lineP = progress(frame, at[0], Math.max(1, at[n - 1] - at[0] + 10));
    return (
      <SceneArea>
        <SceneTitle text={props.title} brand={brand} size={68} at={0} />
        <div style={{ position: "relative", marginTop: 40, flex: 1 }}>
          <div style={{ display: "inline-block", padding: "16px 30px", borderRadius: 999, background: c.accent, color: c.background, fontFamily: fonts.sans, fontWeight: 700, fontSize: 48, transform: `scale(${centerPop})`, transformOrigin: "left center" }}>
            {props.center}
          </div>
          <div style={{ position: "absolute", left: 40, top: 100, width: 2, height: rowH * (n - 0.5) * lineP, background: alpha(c.accent, 0.6) }} />
          {props.nodes.map((node, i) => (
            <NodeCard key={i} node={node} brand={brand} at={at[i]} index={i} width={W - 90} centerY style={{ left: 90, top: 130 + rowH * (i + 0.5), transformOrigin: "left center" }} />
          ))}
        </div>
      </SceneArea>
    );
  }

  // Radial: tarjetas de ~340 px en columnas izquierda/derecha (o centradas arriba/abajo).
  const cardW = n >= 5 ? 320 : 340;
  const cardHalfH = 122;
  const cx = W / 2;
  const cy = H / 2;
  const R = n >= 5 ? 130 : 160;
  const angles = props.nodes.map((_, i) => -Math.PI / 2 + (i / n) * Math.PI * 2 + (n % 2 === 0 ? Math.PI / n : 0));
  const maxSin = Math.max(...angles.map((a) => Math.abs(Math.sin(a))), 0.01);
  const ry = (H / 2 - cardHalfH) / maxSin;
  const positions = angles.map((a) => {
    const cos = Math.cos(a);
    const left = cos > 0.2 ? W - cardW : cos < -0.2 ? 0 : cx - cardW / 2;
    return { left, x: left + cardW / 2, y: cy + Math.sin(a) * ry };
  });
  return (
    <SceneArea>
      <SceneTitle text={props.title} brand={brand} size={68} at={0} />
      <div style={{ position: "absolute", left: 0, top: CANVAS_TOP + 60, width: W, height: H }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle cx={cx} cy={cy} r={R + 70} fill="none" stroke={c.line} strokeDasharray="4 10" />
          {positions.map((p, i) => {
            const len = Math.hypot(p.x - cx, p.y - cy);
            const draw = progress(frame, Math.max(0, at[i] - 8), 12);
            const t = ((frame - at[i]) / (fps * 1.6)) % 1;
            const travel = frame > at[i] + 6 ? t : -1;
            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={alpha(c.accent, 0.55)} strokeWidth={2.5} strokeDasharray={len} strokeDashoffset={(1 - draw) * len} />
                {travel >= 0 ? <circle cx={cx + (p.x - cx) * travel} cy={cy + (p.y - cy) * travel} r={8} fill={c.accent2} opacity={Math.sin(travel * Math.PI)} /> : null}
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={R * centerPop} fill={c.surfaceRaised} stroke={c.accent} strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={(R + 16) * centerPop} fill="none" stroke={alpha(c.accent, 0.3)} strokeWidth={1} />
        </svg>
        <div style={{ position: "absolute", left: cx - R, top: cy - R, width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: fonts.serif, fontSize: props.center.length > 12 ? 48 : 56, lineHeight: 1.02, color: c.text, opacity: centerPop }}>
          {props.center}
        </div>
        {positions.map((p, i) => (
          <NodeCard key={i} node={props.nodes[i]} brand={brand} at={at[i]} index={i} width={cardW} centerY style={{ left: p.left, top: p.y }} />
        ))}
      </div>
    </SceneArea>
  );
};
