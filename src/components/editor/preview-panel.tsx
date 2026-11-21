"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import type { PlayerRef } from "@remotion/player";
import { Button, Icon, Progress, Skeleton, StatusPill } from "@/components/ui";
import type { RenderJob, VideoSpec } from "@/shared/schema";
import { totalDurationInFrames } from "@/shared/schema";
import { fmtClock } from "@/components/app/format";
import { QUALITY_LABEL } from "@/components/app/labels";

const PreviewPlayer = dynamic(() => import("./preview-player"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[9/16] w-full rounded-xl" />,
});

const ACTIVE = ["queued", "bundling", "rendering"];

export function PreviewPanel({
  spec,
  assetBaseUrl,
  loading,
  error,
  playerRef,
  lastRender,
  hasStoryboard,
  onGoStoryboard,
}: {
  spec: VideoSpec | null;
  assetBaseUrl: string;
  loading: boolean;
  error: string | null;
  playerRef: React.Ref<PlayerRef>;
  lastRender: RenderJob | null;
  hasStoryboard: boolean;
  onGoStoryboard: () => void;
}) {
  const [showSafe, setShowSafe] = React.useState(false);
  const active = lastRender && ACTIVE.includes(lastRender.status);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Vista previa · 9:16</span>
        {spec && (
          <span className="font-mono text-[11px] text-subtle tabular">
            {fmtClock(totalDurationInFrames(spec) / spec.fps)} · {spec.fps} fps
          </span>
        )}
      </div>

      {!hasStoryboard ? (
        <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 text-center">
          <Icon name="film" size={20} className="text-subtle" />
          <p className="font-serif text-lg">Sin storyboard aún</p>
          <p className="text-[13px] text-muted">Cuando el guion esté aprobado, crea el storyboard y la animación aparecerá aquí.</p>
          <Button variant="secondary" size="sm" onClick={onGoStoryboard}>Ir a Storyboard</Button>
        </div>
      ) : spec ? (
        <PreviewPlayer spec={spec} assetBaseUrl={assetBaseUrl} playerRef={playerRef} showSafe={showSafe} />
      ) : error ? (
        <div role="alert" className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-danger/40 px-6 text-center text-sm text-danger">
          No se pudo cargar la vista previa: {error}
        </div>
      ) : (
        <Skeleton className="aspect-[9/16] w-full rounded-xl" />
      )}

      {hasStoryboard && (
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted select-none">
          <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
          Mostrar zonas seguras
          {loading && <span className="ml-auto font-mono text-[11px] text-subtle">Actualizando…</span>}
        </label>
      )}

      {lastRender && (
        <div className="flex flex-col gap-2 rounded-lg border border-line px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-muted">{QUALITY_LABEL[lastRender.quality]}</span>
            <StatusPill status={lastRender.status} size="sm" />
          </div>
          {active && <Progress value={lastRender.status === "queued" ? undefined : lastRender.progress} showValue label="Progreso del render" />}
        </div>
      )}
    </div>
  );
}
