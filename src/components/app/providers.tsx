"use client";
import * as React from "react";
import { ToastProvider } from "@/components/ui";
import { HealthProvider } from "./health";
import { applyBrandAttribute, hasStoredBrand, setBrandValue, useBrand } from "./brand-store";
import { api } from "./api-client";
import { BRAND_IDS, type BrandId } from "@/shared/brands";

function BrandSync() {
  const { brand } = useBrand();
  React.useEffect(() => {
    applyBrandAttribute(brand);
  }, [brand]);
  // Primera visita sin elección guardada: usa la marca predeterminada de Configuración.
  React.useEffect(() => {
    if (hasStoredBrand()) return;
    api<{ settings: Record<string, string> }>("/api/settings")
      .then((r) => {
        const d = r.settings.defaultBrand as BrandId | undefined;
        if (d && BRAND_IDS.includes(d) && !hasStoredBrand()) setBrandValue(d);
      })
      .catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <HealthProvider>
        <BrandSync />
        {children}
      </HealthProvider>
    </ToastProvider>
  );
}
