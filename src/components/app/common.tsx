"use client";
import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, Icon, Skeleton, StatusPill } from "@/components/ui";
import type { Project, RenderJob } from "@/shared/schema";
import { BRANDS } from "@/shared/brands";
import { TEMPLATES } from "@/shared/templates";
import { cn } from "@/lib/utils";
import { fmtDate } from "./format";

export function PageContainer({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-6 py-10 xl:px-8", wide ? "max-w-[1480px]" : "max-w-[1280px]", className)}>{children}</div>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={className} title="Proyecto de ejemplo, datos ficticios">
      Demo
    </Badge>
  );
}

export function BrandTag({ brand, className }: { brand: Project["brand"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-muted uppercase", className)}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: BRANDS[brand].colors.accent }} />
      {BRANDS[brand].name}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, actions, className }: { eyebrow?: string; title: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="font-serif text-[24px] leading-8 font-medium tracking-[-0.015em]">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

export function ErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <Card className="flex items-start gap-4 border-danger/40 p-6" role="alert">
      <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </Card>
  );
}

export function InlineError({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger", className)}>
      <Icon name="alert" size={14} className="mt-1 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Miniatura 9:16: fotograma real del último render terminado o, si no hay, composición tipográfica. */
export function Thumb({ project, job, className }: { project: Project; job?: RenderJob | null; className?: string }) {
  const done = job && job.status === "done" && job.outputPath;
  const accent = BRANDS[project.brand].colors.accent;
  return (
    <div
      className={cn("relative aspect-[9/16] shrink-0 overflow-hidden rounded-md border border-line bg-petrol-950", className)}
      aria-hidden
    >
      {done ? (
        <video
          src={`/api/render-jobs/${job.id}/download?inline=1#t=0.8`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col justify-between p-2.5">
          <span className="block h-0.5 w-5 rounded-full" style={{ backgroundColor: accent }} />
          <span className="font-serif text-[10px] leading-3 text-muted">{TEMPLATES[project.template].name}</span>
        </div>
      )}
    </div>
  );
}

export function ProjectCard({ project, job }: { project: Project; job?: RenderJob | null }) {
  return (
    <Link href={`/projects/${project.id}`} className="group block rounded-lg focus-visible:outline-offset-4">
      <Card interactive className="flex h-full gap-4 p-4">
        <Thumb project={project} job={job} className="w-[72px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <BrandTag brand={project.brand} />
            {project.isDemo && <DemoBadge />}
          </div>
          <h3 className="line-clamp-2 font-serif text-[19px] leading-6 font-medium tracking-[-0.01em]">{project.title}</h3>
          {project.isDemo && <p className="text-xs text-muted">Proyecto de ejemplo, datos ficticios.</p>}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <StatusPill status={project.status} size="sm" />
            <span className="font-mono text-[11px] text-subtle tabular">{fmtDate(project.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[168px] rounded-lg" />
      ))}
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
