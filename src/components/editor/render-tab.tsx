"use client";
import * as React from "react";
import { Badge, Button, EmptyState, Icon, Progress, StatusPill, useToast } from "@/components/ui";
import type { Project, RenderJob } from "@/shared/schema";
import { api, errorMessage } from "@/components/app/api-client";
import { InlineError } from "@/components/app/common";
import { fmtBytes, fmtClock, fmtDateTime } from "@/components/app/format";
import { QUALITY_LABEL } from "@/components/app/labels";
import { useInterval } from "@/components/app/use-api";
import { Callout, Mono, Panel } from "./ui-bits";
import type { TabCtx } from "./types";

const ACTIVE = ["queued", "bundling", "rendering"];

export function RenderTab({ ctx }: { ctx: TabCtx }) {
  const { toast } = useToast();
  const { id, bundle } = ctx;
  const jobs = bundle.renders;
  const hasStoryboard = Boolean(bundle.storyboard);
  const [starting, setStarting] = React.useState<null | "preview" | "final">(null);
  const [error, setError] = React.useState<string | null>(null);
  const inflight = React.useRef(false);

  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const lastDoneId = jobs.find((j) => j.status === "done")?.id;

  useInterval(
    async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const fresh = await Promise.all(active.map((j) => api<{ job: RenderJob }>(`/api/render-jobs/${j.id}`).then((r) => r.job).catch(() => j)));
        const map = new Map(fresh.map((j) => [j.id, j]));
        ctx.patch({ renders: jobs.map((j) => map.get(j.id) ?? j) });
        const finished = fresh.filter((j) => !ACTIVE.includes(j.status));
        if (finished.length) {
          ctx.reload();
          ctx.refreshPreview();
          for (const j of finished) {
            if (j.status === "done") toast({ title: "Render terminado", description: QUALITY_LABEL[j.quality], tone: "success" });
            if (j.status === "error") toast({ title: "El render falló", description: j.error ?? undefined, tone: "error" });
          }
        }
      } finally {
        inflight.current = false;
      }
    },
    1500,
    active.length > 0,
  );

  async function start(quality: "preview" | "final") {
    setStarting(quality);
    setError(null);
    try {
      const r = await api<{ job: RenderJob }>(`/api/projects/${id}/render`, { method: "POST", body: { quality } });
      ctx.patch({ renders: [r.job, ...jobs] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStarting(null);
    }
  }

  async function retry(job: RenderJob) {
    setError(null);
    try {
      const r = await api<{ job: RenderJob }>(`/api/render-jobs/${job.id}/retry`, { method: "POST" });
      ctx.patch({ renders: [r.job, ...jobs] });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function cancel(job: RenderJob) {
    try {
      const r = await api<{ job: RenderJob }>(`/api/render-jobs/${job.id}/cancel`, { method: "POST" });
      ctx.patch({ renders: jobs.map((j) => (j.id === job.id ? r.job : j)) });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function approve() {
    try {
      const r = await api<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body: { status: "approved" } });
      ctx.patch({ project: r.project });
      toast({ title: "Proyecto aprobado", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const checks = [
    { ok: hasStoryboard, label: "Storyboard", detail: hasStoryboard ? `${bundle.storyboard!.spec.scenes.length} escenas` : "Falta crearlo" },
    { ok: Boolean(bundle.narration), label: "Narración", detail: bundle.narration ? `${fmtClock(bundle.narration.durationInSeconds)}` : "Sin voz: el video saldrá mudo", soft: true },
    { ok: (bundle.narration?.words.length ?? 0) > 0, label: "Subtítulos", detail: bundle.narration ? `${bundle.narration.words.length} palabras` : "Dependen de la narración", soft: true },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Panel eyebrow="Paso 5" title="Render" description="El video se genera en tu equipo con Remotion. La previsualización usa menor resolución y es mucho más rápida; el render final es 1080×1920 H.264 con audio AAC.">
        <ul className="mb-6 grid gap-3 md:grid-cols-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 rounded-lg border border-line px-4 py-3">
              <Icon name={c.ok ? "check" : "alert"} size={16} className={c.ok ? "mt-0.5 text-success" : c.soft ? "mt-0.5 text-gold-400" : "mt-0.5 text-danger"} />
              <div>
                <p className="text-[13px] font-medium">{c.label}</p>
                <p className="text-[12px] text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" loading={starting === "preview"} disabled={!hasStoryboard} onClick={() => start("preview")}>
            <Icon name="play" size={14} /> Previsualización rápida
          </Button>
          <Button loading={starting === "final"} disabled={!hasStoryboard} onClick={() => start("final")}>
            <Icon name="film" size={16} /> Render final 1080×1920
          </Button>
        </div>
        {error && <InlineError className="mt-4" message={error} />}
      </Panel>

      {jobs.length === 0 ? (
        <EmptyState icon={<Icon name="film" size={20} />} title="Aún no hay renders" description={hasStoryboard ? "Lanza una previsualización rápida para revisar el resultado antes del render final." : "Crea el storyboard para poder renderizar."} />
      ) : (
        <section aria-label="Renders del proyecto" className="flex flex-col gap-4">
          <span className="eyebrow">{jobs.length} render(s)</span>
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} project={bundle.project} expanded={j.id === lastDoneId} onRetry={() => retry(j)} onCancel={() => cancel(j)} onApprove={approve} />
          ))}
        </section>
      )}
    </div>
  );
}

function JobCard({ job, project, expanded, onRetry, onCancel, onApprove }: { job: RenderJob; project: Project; expanded: boolean; onRetry: () => void; onCancel: () => void; onApprove: () => void }) {
  const [openChoice, setOpenChoice] = React.useState<boolean | null>(null);
  const open = openChoice ?? expanded;
  const [videoError, setVideoError] = React.useState(false);
  const active = ACTIVE.includes(job.status);
  const m = job.outputMeta;
  const src = `/api/render-jobs/${job.id}/download?inline=1`;
  return (
    <article className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <Badge variant={job.quality === "final" ? "accent" : "neutral"}>{job.quality === "final" ? "Final" : "Preview"}</Badge>
          <span className="text-[13px]">{QUALITY_LABEL[job.quality]}</span>
          <Mono>{fmtDateTime(job.createdAt)}</Mono>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={job.status} />
          {active && <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>}
        </div>
      </header>
      {active && (
        <div className="px-5 pb-5">
          <Progress value={job.status === "queued" ? undefined : job.progress} showValue label="Progreso del render" />
          <p className="mt-2 text-[12px] text-muted">
            {job.status === "queued" ? "En cola, esperando al render worker…" : job.status === "bundling" ? "Empaquetando la composición de Remotion…" : "Renderizando cuadros. Puede tardar varios minutos."}
          </p>
        </div>
      )}
      {job.status === "error" && (
        <div className="flex flex-col gap-3 px-5 pb-5">
          <InlineError message={job.error ?? "El render falló sin mensaje."} />
          <div><Button variant="secondary" size="sm" onClick={onRetry}><Icon name="refresh" size={14} /> Reintentar</Button></div>
        </div>
      )}
      {job.status === "cancelled" && (
        <div className="flex items-center gap-3 px-5 pb-5">
          <p className="text-[13px] text-muted">Render cancelado.</p>
          <Button variant="secondary" size="sm" onClick={onRetry}><Icon name="refresh" size={14} /> Reintentar</Button>
        </div>
      )}
      {job.status === "done" && (
        <div className="border-t border-line px-5 py-5">
          {open ? (
            <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
              {videoError ? (
                <div role="alert" className="flex aspect-[9/16] items-center justify-center rounded-lg border border-danger/40 p-4 text-center text-[13px] text-danger">No se pudo cargar el video.</div>
              ) : (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={src}
                  onError={() => setVideoError(true)}
                  className="aspect-[9/16] w-full rounded-lg border border-line bg-black"
                  aria-label={`Video renderizado (${QUALITY_LABEL[job.quality]})`}
                />
              )}
              <div className="flex min-w-0 flex-col gap-5">
                {m && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
                    <Meta label="Resolución" value={`${m.width}×${m.height}`} />
                    <Meta label="Duración" value={`${fmtClock(m.durationInSeconds)} (${m.durationInSeconds.toFixed(1)} s)`} />
                    <Meta label="Cuadros/seg" value={`${Math.round(m.fps * 100) / 100} fps`} />
                    <Meta label="Tamaño" value={fmtBytes(m.sizeBytes)} />
                    <Meta label="Audio" value={m.hasAudio ? "Sí" : "No (sin narración)"} />
                  </dl>
                )}
                <div className="flex flex-wrap gap-3">
                  <a href={`/api/render-jobs/${job.id}/download`} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-strong">
                    <Icon name="download" size={16} /> Descargar MP4
                  </a>
                  {job.quality === "final" && project.status === "review" && (
                    <Button variant="secondary" onClick={onApprove}><Icon name="check" size={14} /> Marcar aprobado</Button>
                  )}
                </div>
                {job.quality === "final" && project.status === "review" && (
                  <Callout tone="success" title="Render final listo">Revisa el video completo. Si todo está bien, márcalo como aprobado.</Callout>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Mono>{m ? `${m.width}×${m.height} · ${fmtClock(m.durationInSeconds)} · ${fmtBytes(m.sizeBytes)}` : "Listo"}</Mono>
              <Button variant="outline" size="sm" onClick={() => setOpenChoice(true)}>Ver video</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-mono text-[12px] tabular">{value}</dd>
    </div>
  );
}
