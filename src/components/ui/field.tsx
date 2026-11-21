"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./input";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Recibe los ids para conectar aria-describedby / aria-invalid. */
  children: (ids: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-accent" aria-hidden>*</span>}
      </Label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errId} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
