/** Explicador de funciones: tarjetas que entran en 2.5D (rotateX) una por una. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { SceneArea, SceneTitle, alpha, bodyStyle, monoStyle } from "../primitives/layout";
import { progress, staggerFrames } from "../primitives/easing";
import { Icon } from "../primitives/Icon";
import { fonts } from "../../src/shared/tokens";
import type { SceneComponentProps } from "./types";

export const FeatureExplainer: React.FC<SceneComponentProps<"FeatureExplainer">> = ({ props, brand, durationInFrames }) => {
  const frame = useCurrentFrame();
  const c = brand.colors;
  const n = props.features.length;
  const at = staggerFrames(n, durationInFrames, 22, 0.62);
  const compact = n >= 4;
  return (
    <SceneArea>
      <SceneTitle text={props.title} brand={brand} size={68} />
      <div style={{ marginTop: 60, marginBottom: 20, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: compact ? 20 : 32, perspective: 1400 }}>
        {props.features.map((f, i) => {
          const p = progress(frame, at[i], 20);
          const active = frame >= at[i] && (i === n - 1 || frame < at[i + 1]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 30,
                padding: compact ? "28px 30px" : "44px 36px",
                borderRadius: 18,
                background: active ? c.surfaceRaised : c.surface,
                border: `1.5px solid ${active ? alpha(c.accent, 0.6) : c.line}`,
                opacity: p,
                transform: `rotateX(${(1 - p) * 38}deg) translateY(${(1 - p) * 40}px)`,
                transformOrigin: "50% 0%",
              }}
            >
              <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 14, border: `1.5px solid ${alpha(c.accent, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {f.icon ? <Icon name={f.icon} size={40} color={c.accent} /> : <div style={monoStyle(c.accent, 24)}>{String(i + 1).padStart(2, "0")}</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: compact ? 38 : 46, color: c.text, lineHeight: 1.15 }}>{f.title}</div>
                {f.description ? <div style={{ ...bodyStyle(brand, compact ? 27 : 32), marginTop: 10 }}>{f.description}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </SceneArea>
  );
};
