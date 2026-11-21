import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress",
  {
    variants: {
      variant: {
        primary: "rounded-md bg-accent text-on-accent hover:bg-accent-strong",
        secondary: "rounded-md border border-line bg-raised text-fg hover:border-line-strong hover:bg-navy-600",
        outline: "rounded-md border border-line-strong bg-transparent text-fg hover:border-accent hover:text-accent",
        ghost: "rounded-md bg-transparent text-muted hover:bg-raised hover:text-fg",
        danger: "rounded-md border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9 p-0",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, loading = false, disabled, type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="absolute" />}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
    </button>
  );
}
