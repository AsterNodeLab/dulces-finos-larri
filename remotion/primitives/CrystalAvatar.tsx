/**
 * Avatar PROVISIONAL del presentador "cristal": cabeza low-poly facetada (cian/navy con
 * brillos marfil), traje navy, camisa clara, corbata con acento dorado y manos azuladas.
 * Se usa solo mientras la marca no tenga referenceImage del personaje.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../src/shared/tokens";
import { progress, wave } from "./easing";
import { Hand, HandShape } from "./Hand";

export type AvatarPose = "idle" | "point-left" | "point-right" | "explain";

type P = [number, number];
const V: Record<string, P> = {
  T: [200, 40], TR: [262, 62], R: [292, 140], RL: [276, 214], B: [200, 268], LL: [124, 214], L: [108, 140], TL: [138, 62],
  C: [200, 152], CU: [206, 96], CL: [160, 178], CR: [244, 178],
};
const FACETS: Array<[string, string, string, string]> = [
  ["T", "TR", "CU", palette.cyan400],
  ["T", "CU", "TL", palette.cyan500],
  ["TR", "R", "CU", palette.cyan500],
  ["TL", "CU", "L", palette.navy500],
  ["CU", "R", "C", palette.cyan500],
  ["CU", "C", "L", palette.navy500],
  ["L", "C", "CL", palette.navy600],
  ["C", "R", "CR", palette.navy500],
  ["R", "RL", "CR", palette.navy600],
  ["L", "CL", "LL", palette.petrol700],
  ["CL", "C", "B", palette.navy600],
  ["C", "CR", "B", palette.navy500],
  ["LL", "CL", "B", palette.petrol700],
  ["CR", "RL", "B", palette.petrol700],
];
const pts = (...keys: string[]) => keys.map((k) => V[k].join(",")).join(" ");

const Arm: React.FC<{ x: number; y: number; angle: number; hand: HandShape }> = ({ x, y, angle, hand }) => (
  <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
    <polygon points="-32,-6 32,-6 26,236 -24,236" fill={palette.navy600} />
    <polygon points="-32,-6 0,-6 -6,236 -24,236" fill={palette.petrol700} opacity={0.55} />
    <polygon points="-25,232 27,232 26,252 -24,252" fill={palette.ivory200} />
    <g transform="translate(1, 250)">
      <Hand shape={hand} />
    </g>
  </g>
);

export const CrystalAvatar: React.FC<{ pose: AvatarPose; side: "left" | "right"; at: number; height: number }> = ({ pose, side, at, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bob = wave(frame, fps, 3.6) * 5; // respiración
  const tilt = wave(frame, fps, 5.2, 0.6) * 2.2 + (pose === "point-left" ? -3 : pose === "point-right" ? 3 : 0);
  const g = progress(frame, at, 22); // el gesto entra suavemente
  const sway = wave(frame, fps, 2.4) * 3;

  // El brazo del gesto es el del lado del panel de texto.
  const panelOnLeft = side === "right";
  let leftAngle = 8 + sway * 0.3;
  let rightAngle = -8 - sway * 0.3;
  let leftHand: HandShape = "relaxed";
  let rightHand: HandShape = "relaxed";
  if (pose === "point-left") {
    leftAngle = 8 + g * 84 + sway;
    leftHand = "point";
  } else if (pose === "point-right") {
    rightAngle = -8 - g * 84 - sway;
    rightHand = "point";
  } else if (pose === "explain") {
    if (panelOnLeft) {
      leftAngle = 8 + g * 62 + sway * 1.5;
      leftHand = "open";
    } else {
      rightAngle = -8 - g * 62 - sway * 1.5;
      rightHand = "open";
    }
  }

  return (
    <svg viewBox="0 0 400 760" height={height} style={{ overflow: "visible" }}>
      <g transform={`translate(0, ${bob})`}>
        {/* Sombra de contacto discreta */}
        <ellipse cx={200} cy={752} rx={150} ry={10} fill={palette.petrol950} opacity={0.5} />
        {/* Torso */}
        <path d="M60,760 L68,384 Q78,332 150,312 L200,328 L250,312 Q322,332 332,384 L340,760 Z" fill={palette.navy600} />
        <path d="M60,760 L68,384 Q78,332 150,312 L200,328 L196,760 Z" fill={palette.petrol700} opacity={0.35} />
        <polygon points="162,306 238,306 200,462" fill={palette.ivory200} />
        <polygon points="200,306 238,306 200,462" fill={palette.ivory100} opacity={0.6} />
        {/* Corbata con acento dorado */}
        <polygon points="190,336 210,336 217,350 209,476 200,492 191,476 183,350" fill={palette.petrol800} />
        <polygon points="187,316 213,316 209,338 191,338" fill={palette.gold400} />
        <line x1={186} y1={392} x2={214} y2={380} stroke={palette.gold400} strokeWidth={4} />
        <line x1={188} y1={430} x2={212} y2={420} stroke={palette.gold500} strokeWidth={3} />
        {/* Solapas */}
        <polygon points="148,314 196,424 172,446 116,362" fill={palette.navy500} />
        <polygon points="252,314 204,424 228,446 284,362" fill={palette.navy500} />
        <polygon points="262,424 294,418 292,428 263,434" fill={palette.gold400} />
        {/* Cuello */}
        <polygon points="178,256 222,256 226,302 174,302" fill={palette.navy500} />
        <polygon points="200,256 222,256 226,302 200,302" fill={palette.cyan500} opacity={0.5} />
        {/* Brazos */}
        <Arm x={88} y={362} angle={leftAngle} hand={leftHand} />
        <Arm x={312} y={362} angle={rightAngle} hand={rightHand} />
        {/* Cabeza facetada */}
        <g transform={`rotate(${tilt}, 200, 262)`}>
          {FACETS.map(([a, b, c, fill], i) => (
            <polygon key={i} points={pts(a, b, c)} fill={fill} stroke={palette.petrol900} strokeOpacity={0.35} strokeWidth={1} />
          ))}
          <polygon points="150,72 188,50 172,104" fill={palette.ivory50} opacity={0.55} />
          <polygon points="214,58 252,66 222,92" fill={palette.ivory50} opacity={0.3} />
          {/* Ojos: rendijas luminosas */}
          <polygon points="150,150 182,144 178,156 152,158" fill={palette.ivory50} opacity={0.9} />
          <polygon points="218,144 250,150 248,158 222,156" fill={palette.ivory50} opacity={0.9} />
          <polyline points={pts("T", "TR", "R", "RL", "B", "LL", "L", "TL", "T")} fill="none" stroke={palette.cyan400} strokeWidth={1.5} strokeOpacity={0.6} />
        </g>
      </g>
    </svg>
  );
};
