"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  className?: string;
  /** Prefijo de id para enlazar con TabPanel (id = `${idBase}-panel-${value}`). */
  idBase: string;
}

export function Tabs<T extends string>({ items, value, onValueChange, label, className, idBase }: TabsProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.filter((i) => !i.disabled);
  function onKeyDown(e: React.KeyboardEvent) {
    const idx = enabled.findIndex((i) => i.value === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const v = enabled[next].value;
    onValueChange(v);
    refs.current[items.findIndex((i) => i.value === v)]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn("flex gap-6 border-b border-line", className)}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`${idBase}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "-mb-px border-b-2 pt-1 pb-3 text-sm transition-colors duration-150 disabled:opacity-40",
              selected ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, value, active, className, children }: { idBase: string; value: string; active: boolean; className?: string; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} tabIndex={0} className={cn("pt-6 focus-visible:outline-none", className)}>
      {children}
    </div>
  );
}
