"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, BrandSwitcher, Icon, Tooltip, type IconName } from "@/components/ui";
import { BRANDS } from "@/shared/brands";
import { cn } from "@/lib/utils";
import { useBrand } from "./brand-store";
import { useHealth } from "./health";

const NAV: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Dashboard", icon: "film", match: (p) => p === "/" || p.startsWith("/projects") },
  { href: "/library", label: "Biblioteca", icon: "book", match: (p) => p.startsWith("/library") },
  { href: "/calendar", label: "Calendario", icon: "calendar", match: (p) => p.startsWith("/calendar") },
  { href: "/assets", label: "Recursos de marca", icon: "layers", match: (p) => p.startsWith("/assets") },
  { href: "/settings", label: "Configuración", icon: "settings", match: (p) => p.startsWith("/settings") },
];

export function ModeBadge() {
  const { health } = useHealth();
  if (!health) return <Badge variant="neutral">Conectando…</Badge>;
  return health.mode === "ai" ? (
    <Tooltip content="Hay una clave de IA configurada" side="bottom">
      <Badge variant="accent">IA conectada</Badge>
    </Tooltip>
  ) : (
    <Tooltip content="Sin claves de IA: esqueletos y análisis locales" side="bottom">
      <Badge variant="gold">Offline / Demo</Badge>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { brand, setBrand } = useBrand();
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-bg md:flex">
        <Link href="/" className="flex flex-col gap-1 px-6 pt-7 pb-8 focus-visible:outline-offset-[-2px]">
          <span className="eyebrow !text-accent">Estudio local</span>
          <span className="font-serif text-[22px] leading-7 font-medium tracking-[-0.01em]">VisionQuant Studio</span>
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                  active ? "bg-raised/70 text-fg" : "text-muted hover:bg-raised/40 hover:text-fg",
                )}
              >
                {active && <span aria-hidden className="absolute top-2 bottom-2 -left-3 w-0.5 rounded-full bg-accent" />}
                <Icon name={item.icon} size={16} className={active ? "text-accent" : undefined} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 px-6 py-6">
          <span className="eyebrow">Local</span>
          <p className="text-xs leading-5 text-subtle">Tus proyectos, voces y renders viven en este equipo.</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg/90 px-6 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="font-serif text-base font-medium md:hidden">VisionQuant Studio</Link>
            <span className="eyebrow hidden truncate lg:inline">
              {BRANDS[brand].name} · {BRANDS[brand].tagline}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ModeBadge />
            <BrandSwitcher value={brand} onValueChange={setBrand} />
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
