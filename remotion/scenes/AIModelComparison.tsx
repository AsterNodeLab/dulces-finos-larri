/** Comparativa de modelos: tabla con filas que se revelan y columna destacada. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { CONTENT, SceneArea, SceneTitle, alpha, monoStyle } from "../primitives/layout";
import { progress, revealDeadline, staggerFrames } from "../primitives/easing";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

const LABEL_W = 230;
const ROW_H = 160;
const HEAD_H = 140;

export const AIModelComparison: React.FC<SceneComponentProps<"AIModelComparison">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const cols = props.columns.length;
  const colW = (CONTENT.width - LABEL_W) / cols;
  const rowsAt = staggerFrames(props.rows.length, durationInFrames, 26, 0.6);
  const headIn = progress(frame, Math.min(8, rowsAt[0]), 14);
  const hl = props.highlightColumn !== undefined && props.highlightColumn < cols ? props.highlightColumn : undefined;
  const hlIn = progress(frame, Math.min(rowsAt[rowsAt.length - 1] + 8, revealDeadline(durationInFrames)), 14);
  const tableH = HEAD_H + props.rows.length * ROW_H;

  return (
    <SceneArea>
      <SceneTitle text={props.title} brand={brand} size={66} />
      <div style={{ position: "relative", marginTop: 80, height: tableH }}>
        {hl !== undefined ? (
          <div
            style={{
              position: "absolute",
              left: LABEL_W + hl * colW + 4,
              top: 0,
              width: colW - 8,
              height: tableH * hlIn,
              borderRadius: 16,
              background: alpha(c.accent, 0.08),
              border: `2px solid ${alpha(c.accent, 0.8)}`,
            }}
          />
        ) : null}
        {/* Encabezados */}
        <div style={{ display: "flex", height: HEAD_H, alignItems: "center", opacity: headIn, transform: `translateY(${(1 - headIn) * 16}px)` }}>
          <div style={{ width: LABEL_W, ...monoStyle(alpha(c.text, 0.45), 18) }}>Criterio</div>
          {props.columns.map((col, i) => (
            <div key={i} style={{ width: colW, padding: "0 18px" }}>
              <div style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 1.05, color: c.text }}>{col.name}</div>
              {col.tag ? (
                <div style={{ display: "inline-block", marginTop: 10, padding: "4px 10px", borderRadius: 6, border: `1px solid ${i === hl ? c.accent : c.line}`, ...monoStyle(i === hl ? c.accent : c.textMuted, 15) }}>{col.tag}</div>
              ) : null}
            </div>
          ))}
        </div>
        {props.rows.map((row, r) => {
          const p = progress(frame, rowsAt[r], 16);
          return (
            <div key={r} style={{ display: "flex", height: ROW_H, alignItems: "center", borderTop: `1px solid ${c.line}`, opacity: p, transform: `translateX(${(1 - p) * -24}px)` }}>
              <div style={{ width: LABEL_W, fontFamily: fonts.sans, fontSize: 34, fontWeight: 600, color: c.textMuted, lineHeight: 1.1, paddingRight: 12 }}>{row.label}</div>
              {Array.from({ length: cols }, (_, i) => (
                <div key={i} style={{ width: colW, padding: "0 18px", fontFamily: fonts.sans, fontSize: 34, lineHeight: 1.2, color: i === hl ? c.text : alpha(c.text, 0.78), fontWeight: i === hl ? 600 : 400 }}>
                  {row.values[i] ?? "—"}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {props.sourceNote ? (
        <div style={{ marginTop: "auto", ...monoStyle(c.textMuted, 18), textTransform: "none", letterSpacing: "0.04em", opacity: progress(frame, rowsAt[rowsAt.length - 1], 20) }}>
          Fuente · {props.sourceNote}
        </div>
      ) : null}
    </SceneArea>
  );
};
