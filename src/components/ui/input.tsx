import * as React from "react";
import { cn } from "@/lib/utils";

export const controlBase =
  "w-full rounded-md border border-line bg-petrol-950/40 text-sm text-fg placeholder:text-subtle transition-colors duration-150 hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/40";

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input className={cn(controlBase, "h-10 px-3", className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea className={cn(controlBase, "min-h-24 resize-y px-3 py-2.5 leading-6", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> }) {
  return (
    <div className="relative">
      <select className={cn(controlBase, "h-10 appearance-none pr-9 pl-3", className)} {...p}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-fg", className)} {...p} />;
}
