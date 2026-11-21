/** Íconos de línea (trazo 2px sobre viewBox 24) para todos los ICON_NAMES del contrato. */
import React from "react";
import type { IconName } from "../../src/shared/schema";

const PATHS: Record<IconName, React.ReactNode> = {
  brain: (
    <>
      <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z" />
      <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" />
      <path d="M9 9h1M14 9h1M9 14h1.5M13.5 14H15" />
    </>
  ),
  tool: <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </>
  ),
  code: <path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 5l-3 14" />,
  chat: <path d="M4 5.5h16v10H10l-4.5 3.5V15.5H4z" />,
  spark: <path d="M12 3l1.8 5.6L19.5 10l-5.7 1.6L12 17l-1.8-5.4L4.5 10l5.7-1.4zM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3l2.7 2.7L16.2 9.5" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z" />
    </>
  ),
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  chart: <path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6.5" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.8-3.8 3.8-5.8 7.5-5.8s6.7 2 7.5 5.8" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.5v7l5.5-3.5z" />
    </>
  ),
};

export const Icon: React.FC<{ name: IconName; size?: number; color: string; strokeWidth?: number; style?: React.CSSProperties }> = ({
  name,
  size = 40,
  color,
  strokeWidth = 2,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {PATHS[name]}
  </svg>
);

/** Igual que <Icon> pero como grupo <g> para incrustarlo dentro de otro SVG. */
export const IconGlyph: React.FC<{ name: IconName; x: number; y: number; size: number; color: string }> = ({ name, x, y, size, color }) => (
  <g transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${size / 24})`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
    {PATHS[name]}
  </g>
);
