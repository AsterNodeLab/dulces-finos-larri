"use client";
import * as React from "react";
import Link from "next/link";
import { Badge, Button, EmptyState, Icon, Input, Select, Skeleton, StatusPill, STATUS_META, TabPanel, Tabs, SectionHeader, useToast } from "@/components/ui";
import { BRANDS, BRAND_IDS, type BrandId } from "@/shared/brands";
import { PROJECT_STATUSES, estimateSeconds, type Project, type ProjectStatus, type RenderJob } from "@/shared/schema";
import { TEMPLATES } from "@/shared/templates";
import { api, errorMessage } from "./api-client";
import { useBrand } from "./brand-store";
import { BrandTag, DemoBadge, ErrorCard, InlineError, PageContainer, Thumb } from "./common";
import { fmtBytes, fmtClock, fmtDate } from "./format";
import { providerLabel } from "./labels";
import type { ProjectBundle, ProjectsResponse } from "./types";
import { useApi } from "./use-api";

type TabId = "ideas" | "research" | "scripts" | "projects" | "videos";

function useBundles(ids: string[], enabled: boolean) {
  const key = ids.join(",");
  const [state, setState] = React.useState<{ key: string; map: Record<string, ProjectBundle | null> } | null>(null);
  React.useEffect(() => {
    if (!enabled || ids.length === 0) return;
    let cancelled = false;
    Promise.all(ids.slice(0, 60).map((id) => api<ProjectBundle>(`/api/projects/${id}`).catch(() => null))).then((list) => {
      if (cancelled) return;
      setState({ key, map: Object.fromEntries(ids.slice(0, 60).map((id, i) => [id, list[i]])) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  const ready = ids.length === 0 || (state !== null && state.key === key);
  return { map: state?.key === key ? state.map : {}, loading: enabled && !ready };
}

export function Library() {
  const { toast } = useToast();
  const { brand, showBoth } = useBrand();
  const projects = useApi<ProjectsResponse>("/api/projects");
  const jobs = useApi<{ jobs: RenderJob[] }>("/api/render-jobs?limit=200");
  const [tab, setTab] = React.useState<TabId>("ideas");
  const [brandOverride, setBrandOverride] = React.useState<"all" | BrandId | null>(null);
  const [status, setStatus] = React.useState<"all" | ProjectStatus>("all");
  const [q, setQ] = React.useState("");
  const [idea, setIdea] = React.useState("");
  const [capturing, setCapturing] = React.useState(false);
  const [captureError, setCaptureError] = React.useState<string | null>(null);

  const brandFilter: "all" | BrandId = brandOverride ?? (showBoth ? "all" : brand);
  const all = projects.data?.projects ?? [];
  const norm = q.trim().toLowerCase();
  const filtered = all
    .filter((p) => brandFilter === "all" || p.brand === brandFilter)
    .filter((p) => !norm || p.title.toLowerCase().includes(norm) || p.idea.toLowerCase().includes(norm))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const byStatus = (p: Project) => status === "all" || p.status === status;
  const ideas = filtered.filter((p) => p.status === "idea" && byStatus(p));
  const rows = filtered.filter(byStatus);
  const nonIdea = filtered.filter((p) => p.status !== "idea" && byStatus(p));

  const needBundles = tab === "research" || tab === "scripts";
  const bundles = useBundles(nonIdea.map((p) => p.id), needBundles);
  const researchRows = nonIdea.filter((p) => bundles.map[p.id]?.research);
  const scriptRows = nonIdea.filter((p) => bundles.map[p.id]?.script);

  const byId = new Map(all.map((p) => [p.id, p]));
  const videos = (jobs.data?.jobs ?? [])
    .filter((j) => j.status === "done" && j.quality === "final")
    .map((j) => ({ job: j, project: byId.get(j.projectId) }))
    .filter((v): v is { job: RenderJob; project: Project } => Boolean(v.project) && (brandFilter === "all" || v.project!.brand === brandFilter) && (!norm || v.project!.title.toLowerCase().includes(norm)));

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    const text = idea.trim();
    if (!text) return;
    const target: BrandId = brandFilter === "all" ? brand : brandFilter;
    setCapturing(true);
    setCaptureError(null);
    try {
      const title = text.length > 90 ? `${text.slice(0, 87).trimEnd()}…` : text;
      await api("/api/projects", { method: "POST", body: { title, brand: target, template: BRANDS[target].templates[0], idea: text } });
      setIdea("");
      projects.reload();
      toast({ title: "Idea guardada", description: `Proyecto en estado Idea · ${BRANDS[target].name}`, tone: "success" });
    } catch (err) {
      setCaptureError(errorMessage(err));
    } finally {
      setCapturing(false);
    }
  }

  const loading = projects.loading && !projects.data;
  const tabs: { value: TabId; label: string }[] = [
    { value: "ideas", label: `Ideas (${ideas.length})` },
    { value: "research", label: "Investigaciones" },
    { value: "scripts", label: "Guiones" },
    { value: "projects", label: `Proyectos (${rows.length})` },
    { value: "videos", label: `Videos (${videos.length})` },
  ];

  return (
    <PageContainer>
      <SectionHeader as="h1" eyebrow="Archivo" title="Biblioteca" description="Todo lo que has producido, ordenado por etapa. Cada fila abre el proyecto en su paso correspondiente." />

      <form onSubmit={capture} className="mt-8 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
        <label htmlFor="quick-idea" className="eyebrow">Captura rápida de idea</label>
        <div className="flex gap-3">
          <Input id="quick-idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={4000} placeholder="Escribe una idea de video y guárdala para después…" />
          <Button type="submit" loading={capturing} disabled={!idea.trim()}><Icon name="plus" size={16} /> Guardar idea</Button>
        </div>
        <p className="text-xs text-subtle">Se crea un proyecto en estado “Idea” para {BRANDS[brandFilter === "all" ? brand : brandFilter].name}.</p>
        <InlineError message={captureError} />
      </form>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[320px]">
          <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <Input aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o idea" className="pl-9" />
        </div>
        <div className="w-44">
          <Select aria-label="Filtrar por marca" value={brandFilter} onChange={(e) => setBrandOverride(e.target.value as "all" | BrandId)}>
            <option value="all">Ambas marcas</option>
            {BRAND_IDS.map((b) => <option key={b} value={b}>{BRANDS[b].name}</option>)}
          </Select>
        </div>
        <div className="w-44">
          <Select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value as "all" | ProjectStatus)} disabled={tab === "videos"}>
            <option value="all">Todos los estados</option>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Select>
        </div>
      </div>

      <Tabs idBase="lib" label="Secciones de la biblioteca" items={tabs} value={tab} onValueChange={setTab} className="mt-6 overflow-x-auto" />

      {projects.error && !projects.data ? (
        <div className="mt-8"><ErrorCard title="No pudimos leer la biblioteca" message={projects.error} onRetry={projects.reload} /></div>
      ) : loading ? (
        <div className="mt-8 flex flex-col gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <>
          <TabPanel idBase="lib" value="ideas" active={tab === "ideas"}>
            {ideas.length === 0 ? (
              <EmptyState icon={<Icon name="sparkle" size={20} />} title="Sin ideas guardadas" description="Anota aquí ideas sueltas con la captura rápida y conviértelas en proyecto cuando quieras." />
            ) : (
              <ProjectTable projects={ideas} showIdea hash="research" />
            )}
          </TabPanel>
          <TabPanel idBase="lib" value="research" active={tab === "research"}>
            {bundles.loading ? <Skeleton className="h-40" /> : researchRows.length === 0 ? (
              <EmptyState icon={<Icon name="search" size={20} />} title="Sin investigaciones" description="Aquí aparecen los proyectos que ya tienen fuentes y afirmaciones guardadas." />
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {researchRows.map((p) => {
                  const r = bundles.map[p.id]!.research!;
                  const prov = providerLabel(r.provider);
                  const verified = r.claims.filter((c) => c.status === "verified").length;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
                      <TitleCell project={p} hash="research" />
                      <Badge variant={prov.tone}>{prov.label}</Badge>
                      <span className="font-mono text-[12px] text-muted tabular">{r.sources.length} fuentes · {verified}/{r.claims.length} verificadas</span>
                      <span className="font-mono text-[11px] text-subtle">{fmtDate(r.updatedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabPanel>
          <TabPanel idBase="lib" value="scripts" active={tab === "scripts"}>
            {bundles.loading ? <Skeleton className="h-40" /> : scriptRows.length === 0 ? (
              <EmptyState icon={<Icon name="book" size={20} />} title="Sin guiones" description="Aquí aparecen los proyectos con un guion generado o escrito." />
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {scriptRows.map((p) => {
                  const s = bundles.map[p.id]!.script!;
                  const secs = s.segments.reduce((n, g) => n + estimateSeconds(g.text), 0);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
                      <TitleCell project={p} hash="script" />
                      {s.approvedAt ? <Badge variant="success">Aprobado</Badge> : <Badge variant="neutral">Borrador</Badge>}
                      <span className="font-mono text-[12px] text-muted tabular">v{s.version} · {s.segments.length} segmentos · ≈ {secs.toFixed(0)} s</span>
                      <span className="font-mono text-[11px] text-subtle">{fmtDate(s.updatedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabPanel>
          <TabPanel idBase="lib" value="projects" active={tab === "projects"}>
            {rows.length === 0 ? (
              <EmptyState icon={<Icon name="folder" size={20} />} title="Sin proyectos con estos filtros" description="Cambia la marca, el estado o la búsqueda." />
            ) : (
              <ProjectTable projects={rows} />
            )}
          </TabPanel>
          <TabPanel idBase="lib" value="videos" active={tab === "videos"}>
            {videos.length === 0 ? (
              <EmptyState icon={<Icon name="film" size={20} />} title="Aún no hay videos finales" description="Los renders finales terminados aparecen aquí para verlos y descargarlos." />
            ) : (
              <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
                {videos.map(({ job, project }) => (
                  <li key={job.id} className="flex flex-col gap-3">
                    <Link href={`/projects/${project.id}#render`}><Thumb project={project} job={job} className="w-full" /></Link>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2"><span className="line-clamp-2 text-[13px] leading-[18px] font-medium">{project.title}</span></div>
                      <div className="flex items-center gap-2">{project.isDemo && <DemoBadge />}<BrandTag brand={project.brand} /></div>
                      <span className="font-mono text-[11px] text-subtle tabular">{job.outputMeta ? `${fmtClock(job.outputMeta.durationInSeconds)} · ${fmtBytes(job.outputMeta.sizeBytes)} · ` : ""}{fmtDate(job.finishedAt)}</span>
                      <a href={`/api/render-jobs/${job.id}/download`} className="inline-flex items-center gap-1.5 text-[13px] text-accent underline-offset-4 hover:underline"><Icon name="download" size={14} /> Descargar MP4</a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabPanel>
        </>
      )}
    </PageContainer>
  );
}

function TitleCell({ project, hash }: { project: Project; hash?: string }) {
  return (
    <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
      <Link href={`/projects/${project.id}${hash ? `#${hash}` : ""}`} className="truncate font-medium hover:text-accent">{project.title}</Link>
      {project.isDemo && <DemoBadge />}
    </div>
  );
}

function ProjectTable({ projects, showIdea, hash }: { projects: Project[]; showIdea?: boolean; hash?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="border-b border-line bg-raised/40 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
          <tr>
            <th className="px-5 py-2.5 font-normal">Proyecto</th>
            <th className="px-3 py-2.5 font-normal">Marca</th>
            <th className="px-3 py-2.5 font-normal">Plantilla</th>
            <th className="px-3 py-2.5 font-normal">Estado</th>
            <th className="px-3 py-2.5 text-right font-normal">Actualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {projects.map((p) => (
            <tr key={p.id} className="h-12 transition-colors hover:bg-raised/30">
              <td className="max-w-[360px] px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <Link href={`/projects/${p.id}${hash ? `#${hash}` : ""}`} className="truncate font-medium hover:text-accent">{p.title}</Link>
                  {p.isDemo && <DemoBadge />}
                </div>
                {showIdea && p.idea && p.idea !== p.title && <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">{p.idea}</p>}
              </td>
              <td className="px-3 py-2.5"><BrandTag brand={p.brand} /></td>
              <td className="px-3 py-2.5 text-muted">{TEMPLATES[p.template].name}</td>
              <td className="px-3 py-2.5"><StatusPill status={p.status} size="sm" /></td>
              <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted tabular">{fmtDate(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
