import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/shared/schema";

type RenderStatus = "queued" | "bundling" | "rendering" | "done" | "error" | "cancelled";
export type AnyStatus = ProjectStatus | RenderStatus;

/** Etiqueta + color (hex sobrio) por estado. */
export const STATUS_META: Record<AnyStatus, { label: string; color: string; pulse?: boolean }> = {
  idea: { label: "Idea", color: "#9AABBD" },
  research: { label: "Investigación", color: "#8FB3E0" },
  script: { label: "Guion", color: "#B7A6D9" },
  production: { label: "Producción", color: "#4BD9E8" },
  review: { label: "Revisión", color: "#E3B868" },
  approved: { label: "Aprobado", color: "#7FD1A8" },
  exported: { label: "Exportado", color: "#D8BD80" },
  queued: { label: "En cola", color: "#9AABBD" },
  bundling: { label: "Empaquetando", color: "#8FB3E0", pulse: true },
  rendering: { label: "Renderizando", color: "#4BD9E8", pulse: true },
  done: { label: "Listo", color: "#7FD1A8" },
  error: { label: "Error", color: "#E8735A" },
  cancelled: { label: "Cancelado", color: "#6F8399" },
};

export interface StatusPillProps {
  status: AnyStatus;
  className?: string;
  size?: "sm" | "md";
}

export function StatusPill({ status, className, size = "md" }: StatusPillProps) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border font-mono uppercase tracking-[0.08em]",
        size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-[11px]",
        className,
      )}
      style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}12` }}
    >
      <span className={cn("size-1.5 rounded-full bg-current", meta.pulse && "animate-pulse")} aria-hidden />
      {meta.label}
    </span>
  );
}
