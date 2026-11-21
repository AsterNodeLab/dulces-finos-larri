"use client";
import * as React from "react";
import { Button, Dialog, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Panel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h3 className="font-serif text-xl leading-7 font-medium tracking-[-0.01em]">{title}</h3>}
            {description && <p className="max-w-[64ch] text-[13px] leading-5 text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className="p-5">{children}</div>}
    </section>
  );
}

export function Callout({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "gold" | "danger" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-raised/40",
    gold: "border-gold-400/40 bg-gold-400/[0.06]",
    danger: "border-danger/40 bg-danger/10",
    success: "border-success/40 bg-success/[0.07]",
  } as const;
  const icon = { neutral: "sparkle", gold: "alert", danger: "alert", success: "check" } as const;
  const iconColor = { neutral: "text-accent", gold: "text-gold-400", danger: "text-danger", success: "text-success" } as const;
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={cn("flex gap-3 rounded-lg border px-4 py-3.5 text-[13px] leading-5", tones[tone], className)}>
      <Icon name={icon[tone]} size={16} className={cn("mt-0.5 shrink-0", iconColor[tone])} />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 font-medium text-fg">{title}</p>}
        <div className="text-muted">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "primary",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    />
  );
}

/** Pie fijo de acciones del editor (guardar / estado de cambios). */
export function SaveBar({ dirty, children, note }: { dirty: boolean; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-strong bg-bg/95 px-4 py-3 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <span aria-hidden className={cn("size-1.5 rounded-full", dirty ? "bg-gold-400" : "bg-success")} />
        {note ?? (dirty ? "Hay cambios sin guardar." : "Todo guardado.")}
      </p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] text-muted tabular", className)}>{children}</span>;
}

export function newKey(prefix = "x"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
