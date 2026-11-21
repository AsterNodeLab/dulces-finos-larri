/**
 * Capa de subtítulos. Usa el frame GLOBAL (se monta fuera de las escenas): los tiempos de
 * palabra son segundos desde el inicio del audio, y el audio empieza en el frame 0.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandProfile } from "../../src/shared/brands";
import type { CaptionSettings } from "../../src/shared/schema";
import { fonts, videoFormat } from "../../src/shared/tokens";
import { progress } from "../primitives/easing";
import { alpha } from "../primitives/layout";
import { buildCaptionPages, normalizeWord } from "./pages";

/** Borde inferior del bloque en posición "lower": justo sobre la zona segura inferior. */
export const CAPTION_LOWER_BOTTOM = videoFormat.height - videoFormat.safe.bottom - 40;
export const CAPTION_MIDDLE_CENTER = 1150;

export const Captions: React.FC<{ settings: CaptionSettings; brand: BrandProfile }> = ({ settings, brand }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const pages = useMemo(() => buildCaptionPages(settings.words, settings.maxCharsPerLine, fps), [settings.words, settings.maxCharsPerLine, fps]);
  const keywords = useMemo(() => new Set(settings.keywords.flatMap((k) => k.split(/\s+/)).map(normalizeWord).filter(Boolean)), [settings.keywords]);
  if (!settings.enabled) return null;
  const page = pages.find((p) => frame >= p.startFrame && frame < p.endFrame);
  if (!page) return null;

  const c = brand.colors;
  const enter = progress(frame, page.startFrame, 5);
  const scaleY = height / videoFormat.height;
  const positionStyle: React.CSSProperties =
    settings.position === "middle"
      ? { top: CAPTION_MIDDLE_CENTER * scaleY, transform: `translateY(-50%) translateY(${(1 - enter) * 10}px)` }
      : { bottom: height - CAPTION_LOWER_BOTTOM * scaleY, transform: `translateY(${(1 - enter) * 10}px)` };

  return (
    <div
      style={{
        position: "absolute",
        left: videoFormat.safe.left,
        right: videoFormat.safe.right,
        display: "flex",
        justifyContent: "center",
        opacity: enter,
        ...positionStyle,
      }}
    >
      <div style={{ background: alpha(c.background, 0.78), border: `1px solid ${c.line}`, borderRadius: 18, padding: "16px 30px 20px", textAlign: "center" }}>
        {page.lines.map((line, li) => (
          <div key={li} style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 58, lineHeight: 1.18, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            {line.map((w, wi) => {
              const spoken = frame >= w.startFrame;
              const active = spoken && frame < w.endFrame;
              const isKey = keywords.has(normalizeWord(w.text));
              return (
                <React.Fragment key={wi}>
                <span
                  style={{
                    color: isKey ? c.accent : c.text,
                    opacity: active ? 1 : spoken ? 0.92 : 0.55,
                    display: "inline-block",
                    transform: active ? "translateY(-3px)" : undefined,
                    borderBottom: active ? `3px solid ${alpha(isKey ? c.accent : c.text, 0.6)}` : "3px solid transparent",
                  }}
                >
                  {w.text}
                </span>
                {wi < line.length - 1 ? "\u00a0" : ""}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
