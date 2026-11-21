import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** 0–1. Si es undefined, la barra es indeterminada. */
  value?: number;
  label?: string;
  showValue?: boolean;
  tone?: "accent" | "success" | "danger";
  className?: string;
}

export function Progress({ value, label = "Progreso", showValue, tone = "accent", className }: ProgressProps) {
  const v = value === undefined ? undefined : Math.min(1, Math.max(0, value));
  const bar = { accent: "bg-accent", success: "bg-success", danger: "bg-danger" }[tone];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v === undefined ? undefined : Math.round(v * 100)}
        className="relative h-1 flex-1 overflow-hidden rounded-pill bg-line"
      >
        <div
          className={cn("h-full rounded-pill transition-[width] duration-300 ease-out", bar, v === undefined && "w-1/3 animate-pulse")}
          style={v === undefined ? undefined : { width: `${v * 100}%` }}
        />
      </div>
      {showValue && v !== undefined && <span className="w-10 text-right font-mono text-xs text-muted tabular-nums">{Math.round(v * 100)}%</span>}
    </div>
  );
}

export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-raised/70", className)} {...p} />;
}

export function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical"; className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn("shrink-0 bg-line", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
    />
  );
}

export function Kbd({ className, ...p }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line-strong bg-raised px-1.5 font-mono text-[11px] text-muted", className)} {...p} />
  );
}

/** Tooltip solo CSS: aparece en hover y focus-within. Contenido corto, nunca información esencial. */
export function Tooltip({ content, side = "top", children, className }: { content: string; side?: "top" | "bottom"; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-sm border border-line-strong bg-raised px-2 py-1 text-xs whitespace-nowrap text-fg opacity-0 transition-opacity delay-0 duration-150 group-focus-within/tt:opacity-100 group-hover/tt:opacity-100 group-hover/tt:delay-300",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-8 py-16 text-center", className)}>
      {icon && <div className="mb-5 flex size-12 items-center justify-center rounded-pill border border-line text-accent">{icon}</div>}
      <h3 className="font-serif text-xl leading-7 font-medium">{title}</h3>
      {description && <p className="mt-2 max-w-[44ch] text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, actions, as: H = "h2", className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <H className={cn("font-serif font-medium tracking-[-0.015em]", H === "h1" ? "text-[40px] leading-[48px]" : "text-[28px] leading-9")}>{title}</H>
        {description && <p className="max-w-[60ch] text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
