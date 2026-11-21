"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

export type ToastTone = "neutral" | "success" | "error";
export interface ToastOptions { title: string; description?: string; tone?: ToastTone; duration?: number }
interface ToastItem extends Required<Omit<ToastOptions, "description">> { id: number; description?: string }

const ToastContext = React.createContext<{ toast: (o: ToastOptions) => number; dismiss: (id: number) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);
  const dismiss = React.useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const toast = React.useCallback(
    (o: ToastOptions) => {
      const id = nextId.current++;
      const item: ToastItem = { id, title: o.title, description: o.description, tone: o.tone ?? "neutral", duration: o.duration ?? 5000 };
      setItems((xs) => [...xs.slice(-3), item]);
      if (item.duration > 0) setTimeout(() => dismiss(id), item.duration);
      return id;
    },
    [dismiss],
  );
  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex animate-rise-in items-start gap-3 rounded-md border border-line-strong bg-raised px-4 py-3 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.7)]"
          >
            <Icon
              name={t.tone === "success" ? "check" : t.tone === "error" ? "alert" : "sparkle"}
              className={cn("mt-0.5", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-accent")}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
            </div>
            <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)} className="-mr-1 rounded-sm p-1 text-muted hover:text-fg">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
