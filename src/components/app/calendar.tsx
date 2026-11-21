"use client";
import * as React from "react";
import Link from "next/link";
import { Button, Dialog, EmptyState, Icon, Input, SectionHeader, Select, Skeleton, StatusPill, STATUS_META, useToast } from "@/components/ui";
import { BRANDS } from "@/shared/brands";
import { PROJECT_STATUSES, type Project } from "@/shared/schema";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "./api-client";
import { useBrand } from "./brand-store";
import { DemoBadge, ErrorCard, PageContainer } from "./common";
import { dayKeyOf, toDayKey } from "./format";
import type { ProjectsResponse } from "./types";
import { useApi } from "./use-api";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(year, month, 1 - offset);
  const weeks = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function longDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`;
}

export function CalendarView() {
  const { toast } = useToast();
  const { brand, showBoth, setShowBoth } = useBrand();
  const projects = useApi<ProjectsResponse>("/api/projects");
  const [cursor, setCursor] = React.useState<{ y: number; m: number } | null>(null);
  const [dayOpen, setDayOpen] = React.useState<string | null>(null);
  const [pick, setPick] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const now = new Date();
  const cur = cursor ?? { y: now.getFullYear(), m: now.getMonth() };
  const todayKey = toDayKey(now);

  const all = (projects.data?.projects ?? []).filter((p) => showBoth || p.brand === brand);
  const scheduled = new Map<string, Project[]>();
  const published = new Map<string, Project[]>();
  for (const p of all) {
    const s = dayKeyOf(p.scheduledFor);
    if (s) scheduled.set(s, [...(scheduled.get(s) ?? []), p]);
    const pub = dayKeyOf(p.publishedAt);
    if (pub) published.set(pub, [...(published.get(pub) ?? []), p]);
  }
  const unscheduled = all.filter((p) => !p.scheduledFor && p.status !== "exported");
  const counts = PROJECT_STATUSES.map((s) => ({ s, n: all.filter((p) => p.status === s).length }));

  async function setDate(project: Project, value: string | null) {
    setBusy(true);
    try {
      await api(`/api/projects/${project.id}`, { method: "PATCH", body: { scheduledFor: value } });
      projects.reload();
      toast({ title: value ? `“${project.title}” programado` : "Fecha retirada", description: value ? longDay(value) : undefined, tone: "success" });
      setPick("");
    } catch (e) {
      toast({ title: "No se pudo actualizar la fecha", description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function shift(delta: number) {
    const d = new Date(cur.y, cur.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  const grid = buildGrid(cur.y, cur.m);

  return (
    <PageContainer wide>
      <SectionHeader
        as="h1"
        eyebrow={`Calendario · ${showBoth ? "Ambas marcas" : BRANDS[brand].name}`}
        title="Publicaciones"
        description="Programa la fecha de salida de cada proyecto y revisa cuántos hay en cada etapa."
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowBoth(!showBoth)}>
            {showBoth ? `Ver solo ${BRANDS[brand].name}` : "Ver ambas marcas"}
          </Button>
        }
      />

      {projects.error && !projects.data ? (
        <div className="mt-10"><ErrorCard title="No pudimos leer los proyectos" message={projects.error} onRetry={projects.reload} /></div>
      ) : !projects.data ? (
        <Skeleton className="mt-10 h-[560px]" />
      ) : (
        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-label="Calendario mensual">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[24px] leading-8 font-medium capitalize">{MONTH_NAMES[cur.m]} <span className="text-muted">{cur.y}</span></h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCursor(null)}>Hoy</Button>
                <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => shift(-1)}><Icon name="chevron-left" /></Button>
                <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => shift(1)}><Icon name="chevron-right" /></Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="grid grid-cols-7 border-b border-line bg-raised/40">
                {WEEKDAYS.map((d) => <div key={d} className="px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {grid.map((d, i) => {
                  const key = toDayKey(d);
                  const inMonth = d.getMonth() === cur.m;
                  const isToday = key === todayKey;
                  const items = scheduled.get(key) ?? [];
                  const pubs = published.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "group relative flex min-h-[104px] flex-col gap-1 border-line p-2",
                        i % 7 !== 6 && "border-r",
                        i < grid.length - 7 && "border-b",
                        !inMonth && "bg-petrol-950/40",
                        isToday && "outline outline-1 -outline-offset-1 outline-accent",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("font-mono text-[12px] tabular", inMonth ? (isToday ? "text-accent" : "text-fg") : "text-subtle")}>{d.getDate()}</span>
                        <button
                          type="button"
                          aria-label={`Programar en ${longDay(key)}`}
                          onClick={() => { setDayOpen(key); setPick(""); }}
                          className="rounded-sm p-0.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent focus-visible:opacity-100"
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                      {items.slice(0, 3).map((p) => <Chip key={`s${p.id}`} project={p} />)}
                      {pubs.slice(0, 2).map((p) => <Chip key={`p${p.id}`} project={p} published />)}
                      {items.length + pubs.length > 5 && <span className="font-mono text-[10px] text-subtle">+{items.length + pubs.length - 5} más</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-xs text-subtle">Pasa el cursor sobre un día y pulsa + para asignar un proyecto sin fecha.</p>
          </section>

          <aside className="flex flex-col gap-8">
            <section aria-label="Proyectos por estado">
              <span className="eyebrow">Por estado</span>
              <ul className="mt-3 flex flex-col gap-2">
                {counts.map(({ s, n }) => (
                  <li key={s} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                    <StatusPill status={s} size="sm" />
                    <span className="font-mono text-sm tabular">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Proyectos sin programar">
              <span className="eyebrow">Sin programar ({unscheduled.length})</span>
              {unscheduled.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted">Todo tiene fecha o ya se exportó.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {unscheduled.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex flex-col gap-1.5 rounded-md border border-line px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[13px] hover:text-accent">{p.title}</Link>
                        {p.isDemo && <DemoBadge />}
                      </div>
                      <Input
                        type="date"
                        aria-label={`Fecha de publicación de ${p.title}`}
                        disabled={busy}
                        onChange={(e) => e.target.value && void setDate(p, e.target.value)}
                        className="h-8 font-mono text-[12px]"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      <Dialog
        open={dayOpen !== null}
        onClose={() => setDayOpen(null)}
        title={dayOpen ? longDay(dayOpen) : "Día"}
        description="Proyectos programados y asignación de uno nuevo."
        size="md"
      >
        {dayOpen && (
          <div className="flex flex-col gap-6">
            <div>
              <span className="eyebrow">Programados este día</span>
              {(scheduled.get(dayOpen) ?? []).length === 0 ? (
                <p className="mt-2 text-[13px] text-muted">Nada programado.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {(scheduled.get(dayOpen) ?? []).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-md border border-line px-3 py-2">
                      <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[13px] hover:text-accent">{p.title}</Link>
                      <StatusPill status={p.status} size="sm" />
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDate(p, null)}>Quitar fecha</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <span className="eyebrow">Programar un proyecto</span>
              {unscheduled.length === 0 ? (
                <EmptyState className="mt-2 py-8" title="No hay proyectos sin fecha" description="Crea un proyecto nuevo o quita la fecha de otro." />
              ) : (
                <div className="mt-2 flex gap-3">
                  <Select aria-label="Proyecto sin programar" value={pick} onChange={(e) => setPick(e.target.value)}>
                    <option value="">Elige un proyecto…</option>
                    {unscheduled.map((p) => <option key={p.id} value={p.id}>{p.title} · {STATUS_META[p.status].label}</option>)}
                  </Select>
                  <Button
                    disabled={!pick}
                    loading={busy}
                    onClick={() => {
                      const p = unscheduled.find((x) => x.id === pick);
                      if (p) void setDate(p, dayOpen).then(() => setDayOpen(null));
                    }}
                  >
                    Programar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </PageContainer>
  );
}

function Chip({ project, published }: { project: Project; published?: boolean }) {
  const color = STATUS_META[project.status].color;
  return (
    <Link
      href={`/projects/${project.id}`}
      title={`${project.title}${published ? " · publicado" : ""}`}
      onClick={(e) => e.stopPropagation()}
      className="flex h-5 items-center gap-1.5 overflow-hidden rounded-sm border border-line bg-raised/60 px-1.5 text-[11px] leading-5 hover:border-line-strong"
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: published ? "var(--color-accent-2)" : color }} />
      <span className="truncate">{published ? "↑ " : ""}{project.title}</span>
      {project.isDemo && <span className="shrink-0 font-mono text-[9px] text-gold-400">DEMO</span>}
    </Link>
  );
}


