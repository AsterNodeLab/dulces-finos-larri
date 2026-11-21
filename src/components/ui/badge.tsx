import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] leading-4 tracking-[0.08em] uppercase",
  {
    variants: {
      variant: {
        neutral: "border-line bg-raised/60 text-muted",
        accent: "border-accent/35 bg-accent/10 text-accent",
        gold: "border-gold-400/35 bg-gold-400/10 text-gold-400",
        cyan: "border-cyan-400/35 bg-cyan-400/10 text-cyan-400",
        success: "border-success/35 bg-success/10 text-success",
        danger: "border-danger/40 bg-danger/10 text-danger",
        outline: "border-line-strong text-fg",
        /** Contenido de demostración: siempre visible y explícito. */
        demo: "border-dashed border-gold-400/60 bg-transparent text-gold-400",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...p }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...p} />;
}
