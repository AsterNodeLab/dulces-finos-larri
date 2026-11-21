import * as React from "react";
import { cn } from "@/lib/utils";

/** Iconos de línea 2px, 24x24, heredan currentColor. */
const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="M7 4.5v15l12-7.5-12-7.5z" />,
  film: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  wand: <path d="M4 20 15 9M13 7l4 4M17 3v3M15.5 4.5h3M20 8v2M19 9h2" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  check: <path d="m5 12 5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (<><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></>),
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h14" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 17v4M17 19h4" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof paths;
export const ICON_NAMES = Object.keys(paths) as IconName[];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Si se pasa, el icono se anuncia; si no, es decorativo (aria-hidden). */
  label?: string;
}

export function Icon({ name, size = 16, label, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
