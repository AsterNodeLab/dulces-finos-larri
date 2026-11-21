"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const widths = { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[760px]" };

export function Dialog({ open, onClose, title, description, children, footer, className, size = "md" }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className={cn(
        "m-auto w-[calc(100%-32px)] rounded-lg border border-line-strong bg-surface p-0 text-fg shadow-[0_24px_64px_-24px_rgb(0_0_0/0.6)] open:animate-rise-in",
        widths[size],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="font-serif text-xl leading-7 font-medium">{title}</h2>
          {description && <p id={descId} className="text-sm text-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-2 rounded-md p-2 text-muted hover:bg-raised hover:text-fg">
          <Icon name="x" />
        </button>
      </div>
      {children && <div className="px-6 py-5">{children}</div>}
      {footer && <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}
