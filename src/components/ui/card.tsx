import * as React from "react";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, interactive, ...p }: DivProps & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface text-fg",
        interactive && "transition-colors duration-150 hover:border-line-strong hover:bg-raised/60",
        className,
      )}
      {...p}
    />
  );
}
export function CardHeader({ className, ...p }: DivProps) {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-4", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-xl leading-7 font-medium tracking-[-0.01em]", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...p} />;
}
export function CardContent({ className, ...p }: DivProps) {
  return <div className={cn("px-6 pb-6", className)} {...p} />;
}
export function CardFooter({ className, ...p }: DivProps) {
  return <div className={cn("flex items-center gap-3 border-t border-line px-6 py-4", className)} {...p} />;
}
