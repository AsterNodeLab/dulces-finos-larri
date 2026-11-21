/**
 * Presentador "cristal" junto a un panel de texto. Sin referenceImage dibuja el avatar
 * provisional en SVG; con referenceImage muestra la imagen con flotación 2.5D y un indicador.
 */
import React from "react";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";
import { CONTENT, Eyebrow, alpha, headlineStyle, monoStyle } from "../primitives/layout";
import { progress, wave } from "../primitives/easing";
import { WordReveal, tokenize } from "../primitives/Reveal";
import { CrystalAvatar } from "../primitives/CrystalAvatar";
import { Pointer } from "../primitives/Pointer";
import { resolveAsset } from "../lib/assets";
import type { SceneComponentProps } from "./types";

const PANEL_W = 440;

export const CrystalPresenter: React.FC<SceneComponentProps<"CrystalPresenter">> = ({ props, brand, durationInFrames, assetBaseUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = brand.colors;
  const avatarRight = props.side === "right";
  const panelX = avatarRight ? CONTENT.left : CONTENT.right - PANEL_W;
  const avatarX = avatarRight ? CONTENT.right - 430 : CONTENT.left - 20;
  const tokens = tokenize(props.line);
  // Legible desde el frame ~10 sin importar la duración: revelado rápido y acotado.
  const span = Math.min(6, Math.max(0, durationInFrames - 20));
  const panelIn = progress(frame, 0, 8);
  const avatarIn = progress(frame, 0, 12);
  const size = props.line.length > 80 ? 48 : props.line.length > 50 ? 56 : 66;
  const pointsAtPanel = props.pose === "explain" || (props.pose === "point-left" && avatarRight) || (props.pose === "point-right" && !avatarRight);

  return (
    <>
      {/* Panel de texto: capa delantera (parallax opuesto al avatar). */}
      <div
        style={{
          position: "absolute",
          left: panelX,
          top: 330,
          width: PANEL_W,
          opacity: panelIn,
          transform: `translate(${(1 - panelIn) * (avatarRight ? -30 : 30) + wave(frame, fps, 8) * 3}px, 0)`,
        }}
      >
        <Eyebrow text="En pocas palabras" brand={brand} at={0} />
        <div style={{ marginTop: 34, paddingLeft: 28, borderLeft: `3px solid ${alpha(c.accent, 0.8)}` }}>
          <WordReveal tokens={tokens} startFrame={1} spanFrames={span} wordFrames={6} style={{ ...headlineStyle(brand, size), lineHeight: 1.08 }} />
        </div>
        {pointsAtPanel ? <Pointer brand={brand} at={10} side={avatarRight ? "right" : "left"} /> : null}
      </div>

      {/* Avatar: capa trasera con flotación sutil. */}
      <div
        style={{
          position: "absolute",
          left: avatarX,
          top: 440 + (1 - avatarIn) * 40,
          width: 450,
          opacity: avatarIn,
          transform: `perspective(1200px) rotateY(${avatarRight ? -6 : 6}deg) translateY(${wave(frame, fps, 6) * 4}px)`,
        }}
      >
        {props.referenceImage ? (
          <Img src={resolveAsset(props.referenceImage, assetBaseUrl)} style={{ width: 450, height: 790, objectFit: "contain", objectPosition: "bottom" }} />
        ) : (
          <CrystalAvatar pose={props.pose} side={props.side} at={4} height={790} />
        )}
      </div>
      {!props.referenceImage ? (
        <div style={{ position: "absolute", left: avatarX + 40, top: 1238, ...monoStyle(c.textMuted, 18), opacity: 0.8 * avatarIn }}>Avatar provisional</div>
      ) : null}
    </>
  );
};
