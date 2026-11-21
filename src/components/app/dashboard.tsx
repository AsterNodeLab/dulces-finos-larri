"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Icon, Progress, SectionHeader, Skeleton, StatusPill, useToast } from "@/components/ui";
import { BRANDS } from "@/shared/brands";
import type { Project, RenderJob } from "@/shared/schema";
import { api, errorMessage } from "./api-client";
import { useBrand } from "./brand-store";
import { BrandTag, CardGridSkeleton, DemoBadge, ErrorCard, PageContainer, ProjectCard, SectionTitle, Thumb } from "./common";
import { fmtBytes, fmtClock, fmtDate, fmtDateTime } from "./format";
import { useInterval, useApi } from "./use-api";
import { QUALITY_LABEL, SCENE_LABEL } from "./labels";
import type { ProjectsResponse, TemplatesResponse } from "./types";

const ACTIVE = ["queued", "bundling", "rendering"];

function nextStep(p: Project): string {
  switch (p.status) {
    case "idea": return "Siguiente: reunir fuentes e investigar";
    case "research": return "Siguiente: generar el guion";
    case "script": return "Siguiente: aprobar el guion y crear el storyboard";
    case "production": return "Siguiente: storyboard, voz y render";
    case "review": return "Siguiente: revisar el video y aprobarlo";
    case "approved": return "Aprobado: listo para publicar";
    default: return "Publicado";
  }
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="eyebrow">{label}</span>
      <span className="font-serif text-[40px] leading-[44px] font-medium tracking-[-0.015em] tabular">{value}</span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </Card>
  );
}

function RenderRow({ job, project }: { job: RenderJob; project?: Project }) {
  const active = ACTIVE.includes(job.status);
  return (
    <li className="flex flex-col gap-2 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/projects/${job.projectId}#render`} className="min-w-0 truncate text-sm font-medium hover:text-accent">
          {project?.title ?? "Proyecto eliminado"}
        </Link>
        <StatusPill status={job.status} size="sm" />
      </div>
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-subtle">
        <span>{QUALITY_LABEL[job.quality]}</span>
        <span className="tabular">{fmtDateTime(job.createdAt)}</span>
      </div>
      {active && <Progress value={job.status === "queued" ? undefined : job.progress} showValue label="Progreso del render" />}
      {job.status === "error" && job.error && <p className="line-clamp-2 text-xs text-danger">{job.error}</p>}
    </li>
  );
}

export function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { brand, showBoth, setShowBoth } = useBrand();
  const projects = useApi<ProjectsResponse>("/api/projects");
  const jobs = useApi<{ jobs: RenderJob[] }>("/api/render-jobs?limit=100");
  const templates = useApi<TemplatesResponse>("/api/templates");
  const [openingDemo, setOpeningDemo] = React.useState(false);

  const activeJobs = (jobs.data?.jobs ?? []).filter((j) => ACTIVE.includes(j.status));
  const reloadProjects = projects.reload;
  const reloadJobs = jobs.reload;
  useInterval(
    () => {
      reloadJobs();
      reloadProjects();
    },
    2000,
    activeJobs.length > 0,
  );

  async function openDemo() {
    setOpeningDemo(true);
    try {
      const r = await api<{ project: Project }>("/api/demo", { method: "POST" });
      router.push(`/projects/${r.project.id}`);
    } catch (e) {
      toast({ title: "No pudimos abrir la demostración", description: errorMessage(e), tone: "error" });
      setOpeningDemo(false);
    }
  }

  const all = projects.data?.projects ?? [];
  const visible = showBoth ? all : all.filter((p) => p.brand === brand);
  const visibleIds = new Set(visible.map((p) => p.id));
  const byId = new Map(all.map((p) => [p.id, p]));
  const allJobs = (jobs.data?.jobs ?? []).filter((j) => visibleIds.has(j.projectId));

  const inProduction = visible.filter((p) => p.status === "script" || p.status === "production" || p.status === "review");
  const recents = [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const month = new Date().toISOString().slice(0, 7);
  const exportedMonth = visible.filter((p) => p.status === "exported" && (p.publishedAt ?? p.updatedAt).startsWith(month)).length;
  const inReview = visible.filter((p) => p.status === "review").length;
  const queued = allJobs.filter((j) => ACTIVE.includes(j.status)).length;

  // Videos completados: último render final listo por proyecto.
  const completed: { project: Project; job: RenderJob }[] = [];
  const seen = new Set<string>();
  for (const j of allJobs) {
    if (j.status !== "done" || j.quality !== "final" || seen.has(j.projectId)) continue;
    const project = byId.get(j.projectId);
    if (project) {
      seen.add(j.projectId);
      completed.push({ project, job: j });
    }
  }

  const loading = projects.loading && !projects.data;
  const templateList = (templates.data?.templates ?? []).filter((t) => showBoth || BRANDS[brand].templates.includes(t.id));

  const actions = (
    <Button size="lg" onClick={() => router.push("/projects/new")}>
      <Icon name="plus" size={16} /> Crear video
    </Button>
  );

  return (
    <PageContainer>
      <SectionHeader as="h1" eyebrow={`Estudio · ${showBoth ? "Ambas marcas" : BRANDS[brand].name}`} title="Proyectos" actions={actions} />

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{showBoth ? "Mostrando proyectos de Vision One y VisionQuant." : `Mostrando solo proyectos de ${BRANDS[brand].name}.`}</span>
        <button
          type="button"
          onClick={() => setShowBoth(!showBoth)}
          className="rounded-sm text-accent underline-offset-4 hover:underline"
        >
          {showBoth ? `Ver solo ${BRANDS[brand].name}` : "Ver ambas"}
        </button>
      </div>

      {projects.error && !projects.data ? (
        <div className="mt-10">
          <ErrorCard title="No pudimos leer los proyectos" message={projects.error} onRetry={projects.reload} />
        </div>
      ) : loading ? (
        <div className="mt-10 flex flex-col gap-10">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-lg" />)}
          </div>
          <CardGridSkeleton />
        </div>
      ) : all.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Icon name="film" size={20} />}
            title="Aún no hay proyectos"
            description="Empieza con una idea o abre el proyecto demo para ver el flujo completo."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => router.push("/projects/new")}>
                  <Icon name="plus" size={16} /> Crear proyecto
                </Button>
                <Button variant="secondary" loading={openingDemo} onClick={openDemo}>
                  Abrir proyecto de demostración
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          <section aria-label="Resumen" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="En producción" value={inProduction.length} hint="Guion, producción o revisión" />
            <Stat label="En revisión" value={inReview} hint="Esperan tu aprobación" />
            <Stat label="Exportados este mes" value={exportedMonth} hint="Marcados como exportados" />
            <Stat label="Renders en cola" value={queued} hint={queued ? "Procesando ahora" : "Nada pendiente"} />
          </section>

          {visible.length === 0 && (
            <EmptyState
              title={`Sin proyectos de ${BRANDS[brand].name}`}
              description="Hay proyectos de la otra marca. Cambia de marca arriba, usa “Ver ambas” o crea uno nuevo."
              action={<Button onClick={() => router.push("/projects/new")}>Crear proyecto</Button>}
            />
          )}

          {inProduction.length > 0 && (
            <section aria-labelledby="h-prod">
              <SectionTitle eyebrow={`${inProduction.length} activos`} title="En producción" />
              <Card>
                <ul className="divide-y divide-line px-5">
                  {inProduction.map((p) => {
                    const job = projects.data?.lastRender[p.id] ?? null;
                    const active = job && ACTIVE.includes(job.status);
                    return (
                      <li key={p.id} className="flex items-center gap-5 py-4">
                        <Thumb project={p} job={job} className="w-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link href={`/projects/${p.id}`} className="truncate font-serif text-lg leading-6 font-medium hover:text-accent">{p.title}</Link>
                            {p.isDemo && <DemoBadge />}
                          </div>
                          <p className="mt-0.5 text-[13px] text-muted">{nextStep(p)}</p>
                        </div>
                        <div className="hidden w-48 flex-col items-end gap-1.5 md:flex">
                          {active ? (
                            <>
                              <StatusPill status={job.status} size="sm" />
                              <Progress className="w-full" value={job.status === "queued" ? undefined : job.progress} showValue label="Render" />
                            </>
                          ) : job ? (
                            <StatusPill status={job.status} size="sm" />
                          ) : (
                            <span className="font-mono text-[11px] text-subtle">Sin render</span>
                          )}
                        </div>
                        <StatusPill status={p.status} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          )}

          {recents.length > 0 && (
            <section aria-labelledby="h-rec">
              <SectionTitle eyebrow="Última actividad" title="Recientes" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {recents.map((p) => (
                  <ProjectCard key={p.id} project={p} job={projects.data?.lastRender[p.id]} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="h-done">
            <SectionTitle eyebrow="Render final listo" title="Videos completados" />
            {completed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-6 py-8 text-sm text-muted">
                Todavía no hay renders finales terminados. Cuando lances un “Render final 1080×1920” desde un proyecto, aparecerá aquí con su descarga.
              </p>
            ) : (
              <ul className="flex gap-4 overflow-x-auto pb-2">
                {completed.map(({ project, job }) => (
                  <li key={job.id} className="flex w-[148px] shrink-0 flex-col gap-3">
                    <Link href={`/projects/${project.id}#render`} aria-label={`Abrir ${project.title}`}>
                      <Thumb project={project} job={job} className="w-full" />
                    </Link>
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 text-[13px] leading-[18px] font-medium">{project.title}</span>
                      <span className="font-mono text-[11px] text-subtle tabular">
                        {job.outputMeta ? `${fmtClock(job.outputMeta.durationInSeconds)} · ${fmtBytes(job.outputMeta.sizeBytes)}` : fmtDate(job.finishedAt)}
                      </span>
                      <a
                        href={`/api/render-jobs/${job.id}/download`}
                        className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent underline-offset-4 hover:underline"
                      >
                        <Icon name="download" size={14} /> Descargar MP4
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <section aria-labelledby="h-renders">
              <SectionTitle eyebrow="Cola local" title="Estado de renders" />
              {allJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-6 py-8 text-sm text-muted">Aún no se ha lanzado ningún render.</p>
              ) : (
                <Card>
                  <ul className="divide-y divide-line px-5">
                    {allJobs.slice(0, 7).map((j) => (
                      <RenderRow key={j.id} job={j} project={byId.get(j.projectId)} />
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            <section aria-labelledby="h-tpl">
              <SectionTitle eyebrow="Biblioteca" title="Plantillas" />
              {templates.loading && !templates.data ? (
                <Skeleton className="h-48 rounded-lg" />
              ) : templates.error ? (
                <ErrorCard title="No pudimos leer las plantillas" message={templates.error} onRetry={templates.reload} />
              ) : (
                <div className="flex flex-col gap-3">
                  {templateList.map((t) => {
                    const seq = Array.from(new Set(Object.values(t.roleToScene)));
                    return (
                      <Card key={t.id} className="flex items-start justify-between gap-4 p-5">
                        <div className="min-w-0">
                          <h3 className="font-serif text-lg font-medium">{t.name}</h3>
                          <p className="mt-1 text-[13px] text-muted">{t.description}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {seq.map((s) => (
                              <Badge key={s} variant="neutral" className="!normal-case !tracking-normal">{SCENE_LABEL[s]}</Badge>
                            ))}
                          </div>
                        </div>
                        <Link
                          href={`/projects/new?template=${t.id}`}
                          className="shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent"
                        >
                          Usar plantilla
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <p className="flex items-center gap-2 text-xs text-subtle">
            <BrandTag brand={brand} /> <span>·</span>
            <button type="button" onClick={openDemo} disabled={openingDemo} className="underline-offset-4 hover:text-fg hover:underline">
              Abrir proyecto de demostración
            </button>
          </p>
        </div>
      )}
    </PageContainer>
  );
}
