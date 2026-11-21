/**
 * Envoltura de cada escena: transición de ENTRADA (dentro de los primeros ~12 frames
 * de la propia escena, sin solapar la línea de tiempo) + cámara sutil.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, easeOut, progress, wave } from "./easing";

export type TransitionKind = "none" | "fade" | "slide-up" | "wipe";
export type CameraKind = "static" | "push-in" | "drift";

export const ENTRY_FRAMES = 12;

export const SceneFrame: React.FC<{
  transition: TransitionKind;
  camera: CameraKind;
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ transition, camera, durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = progress(frame, 0, Math.min(ENTRY_FRAMES, durationInFrames - 1), easeOut);

  let opacity = 1;
  let translateY = 0;
  let clipPath: string | undefined;
  if (transition === "fade") opacity = p;
  if (transition === "slide-up") {
    opacity = p;
    translateY = (1 - p) * 90;
  }
  if (transition === "wipe") {
    clipPath = p < 1 ? `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` : undefined;
  }

  let scale = 1;
  let tx = 0;
  let ty = 0;
  if (camera === "push-in") {
    scale = interpolate(frame, [0, durationInFrames], [1, 1.045], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  } else if (camera === "drift") {
    scale = 1.012;
    tx = wave(frame, fps, 11) * 8;
    ty = wave(frame, fps, 13, 1.2) * 6 - (frame / Math.max(1, durationInFrames)) * 10;
  }

  return (
    <AbsoluteFill style={{ opacity, clipPath, transform: `translateY(${translateY}px)` }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: "50% 40%" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
