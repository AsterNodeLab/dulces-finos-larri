/**
 * Mano provisional facetada (azulada) del avatar. Dibujada en coordenadas locales:
 * la muñeca está en (0,0) y la mano se extiende hacia +y.
 */
import React from "react";
import { palette } from "../../src/shared/tokens";

export type HandShape = "relaxed" | "point" | "open";

export const Hand: React.FC<{ shape: HandShape }> = ({ shape }) => {
  const base = palette.cyan500;
  const dark = palette.navy500;
  const light = palette.cyan400;
  if (shape === "point") {
    return (
      <g>
        <polygon points="-20,0 20,0 24,34 -22,36" fill={dark} />
        <polygon points="-20,0 20,0 0,30" fill={base} />
        {/* índice extendido */}
        <polygon points="-6,34 8,34 6,92 -4,92" fill={light} />
        <polygon points="-6,34 8,34 1,92" fill={base} opacity={0.6} />
        {/* pulgar y nudillos */}
        <polygon points="20,10 34,22 26,38 18,30" fill={base} />
        <polygon points="-22,36 24,34 18,52 -16,54" fill={dark} />
      </g>
    );
  }
  if (shape === "open") {
    // Palma abierta "explicando": dedos separados en abanico.
    return (
      <g>
        <polygon points="-24,0 24,0 30,44 -28,46" fill={dark} />
        <polygon points="-24,0 24,0 2,40" fill={base} />
        {[-22, -8, 6, 20].map((x, i) => (
          <polygon key={i} points={`${x - 6},44 ${x + 6},44 ${x + 4 + (i - 1.5) * 4},${86 - Math.abs(i - 1.5) * 8} ${x - 4 + (i - 1.5) * 4},${86 - Math.abs(i - 1.5) * 8}`} fill={i % 2 ? light : base} />
        ))}
        <polygon points="24,8 46,18 40,34 26,28" fill={light} />
      </g>
    );
  }
  return (
    <g>
      <polygon points="-20,0 20,0 24,46 -22,48" fill={dark} />
      <polygon points="-20,0 20,0 2,40" fill={base} />
      <polygon points="-22,48 24,46 14,66 -14,66" fill={base} opacity={0.85} />
      <polygon points="20,12 30,28 22,40" fill={light} />
    </g>
  );
};
