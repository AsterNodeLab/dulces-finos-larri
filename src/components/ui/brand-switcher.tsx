"use client";
import { BRANDS, BRAND_IDS, type BrandId } from "@/shared/brands";
import { cn } from "@/lib/utils";

export interface BrandSwitcherProps {
  value: BrandId;
  onValueChange: (id: BrandId) => void;
  className?: string;
}

/** Control segmentado (radiogroup). El layout debe reflejar la marca en <html data-brand>. */
export function BrandSwitcher({ value, onValueChange, className }: BrandSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Marca" className={cn("inline-flex rounded-md border border-line bg-petrol-950/40 p-0.5", className)}>
      {BRAND_IDS.map((id) => {
        const b = BRANDS[id];
        const checked = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onValueChange(id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const i = BRAND_IDS.indexOf(id);
                onValueChange(BRAND_IDS[(i + (e.key === "ArrowRight" ? 1 : -1) + BRAND_IDS.length) % BRAND_IDS.length]);
              }
            }}
            tabIndex={checked ? 0 : -1}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-[7px] px-3 text-[13px] transition-colors duration-150",
              checked ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: b.colors.accent }} aria-hidden />
            {b.name}
          </button>
        );
      })}
    </div>
  );
}
