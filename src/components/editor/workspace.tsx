"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { Button, Dialog, Icon, Input, Select, Skeleton, StatusPill, STATUS_META, TabPanel, Tabs, useToast } from "@/components/ui";
import { PROJECT_STATUSES, type Project, type ProjectStatus, type VideoSpec } from "@/shared/schema";
import { TEMPLATES } from "@/shared/templates";
import { api, errorMessage } from "@/components/app/api-client";
import { BrandTag, DemoBadge, ErrorCard, PageContainer } from "@/components/app/common";
import { useApi, useMediaQuery } from "@/components/app/use-api";
import type { ProjectBundle } from "@/components/app/types";
import { PreviewPanel } from "./preview-panel";
import { TAB_IDS, type TabCtx, type TabId } from "./types";
import { ResearchTab } from "./research-tab";
import { ScriptTab } from "./script-tab";
import { StoryboardTab } from "./storyboard-tab";
import { VoiceTab } from "./voice-tab";
import { RenderTab } from "./render-tab";
import { MetricsTab } from "./metrics-tab";

const IDBASE = "ws";

function autoTab(b: ProjectBundle): TabId {
  if (b.renders.some((r) => r.status === "done")) return "render";
  if (b.storyboard) return b.narration ? "render" : "voice";
  if (b.script?.approvedAt) return "storyboard";
  if (b.script) return "script";
  if (b.research) return "script";
  return "research";
}

function EditableTitle({ project, onSave }: { project: Project; onSave: (title: string) => Promise<void> }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(project.title);
  const [saving, setSaving] = React.useState(false);
  async function commit() {
    const v = value.trim();
    if (!v || v === project.title) {
      setValue(project.title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(v);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }
  if (editing) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void commit();
        }}
      >
        <Input
          aria-label="Título del proyecto"
          autoFocus
          value={value}
          maxLength={140}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(project.title);
              setEditing(false);
            }
          }}
          className="h-12 w-[min(560px,100%)] font-serif text-2xl"
        />
        <Button type="submit" size="sm" loading={saving}>Guardar</Button>
        <Button variant="ghost" size="sm" onClick={() => { setValue(project.title); setEditing(false); }}>Cancelar</Button>
      </form>
    );
  }
  return (
    <div className="group flex min-w-0 items-center gap-3">
      <h1 className="truncate font-serif text-[32px] leading-10 font-medium tracking-[-0.015em]">{project.title}</h1>
      <button
        type="button"
        aria-label="Editar título"
        onClick={() => { setValue(project.title); setEditing(true); }}
        className="rounded-md p-1.5 text-subtle opacity-60 transition-opacity group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
      >
        <Icon name="edit" size={16} />
      </button>
    </div>
  );
}

export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const bundleApi = useApi<ProjectBundle>(`/api/projects/${id}`);
  const bundle = bundleApi.data;
  const hasStoryboard = Boolean(bundle?.storyboard);
  const previewApi = useApi<{ spec: VideoSpec; assetBaseUrl: string }>(hasStoryboard ? `/api/projects/${id}/preview-spec` : null);
  const playerRef = React.useRef<PlayerRef>(null);
  const wide = useMediaQuery("(min-width: 1320px)");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [tabChoice, setTabChoice] = React.useState<TabId | null>(() => {
    if (typeof window === "undefined") return null;
    const h = window.location.hash.replace("#", "");
    return (TAB_IDS as readonly string[]).includes(h) ? (h as TabId) : null;
  });

  const tab: TabId = tabChoice ?? (bundle ? autoTab(bundle) : "research");
  const setTab = React.useCallback((t: TabId) => {
    setTabChoice(t);
    try {
      window.history.replaceState(null, "", `#${t}`);
    } catch {
      /* ignora */
    }
  }, []);

  const { setData, reload: reloadBundle } = bundleApi;
  const patch = React.useCallback((p: Partial<ProjectBundle>) => setData((prev) => (prev ? { ...prev, ...p } : prev)), [setData]);
  const reloadPreview = previewApi.reload;
  const refreshPreview = React.useCallback(() => reloadPreview(), [reloadPreview]);
  const seek = React.useCallback((frame: number) => {
    const p = playerRef.current;
    if (p) p.seekTo(Math.max(0, Math.round(frame)));
  }, []);

  async function updateProject(body: Record<string, unknown>) {
    try {
      const r = await api<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body });
      patch({ project: r.project });
    } catch (e) {
      toast({ title: "No se pudo actualizar el proyecto", description: errorMessage(e), tone: "error" });
      throw e;
    }
  }

  async function changeStatus(status: ProjectStatus) {
    try {
      await updateProject({ status });
      toast({ title: `Estado: ${STATUS_META[status].label}`, tone: "success" });
    } catch {
      /* updateProject ya mostró el aviso */
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      toast({ title: "Proyecto eliminado", tone: "success" });
      router.push("/");
    } catch (e) {
      toast({ title: "No se pudo eliminar", description: errorMessage(e), tone: "error" });
      setDeleting(false);
    }
  }

  if (bundleApi.error && !bundle) {
    return (
      <PageContainer>
        <ErrorCard title="No pudimos abrir el proyecto" message={bundleApi.error} onRetry={bundleApi.reload} />
        <p className="mt-6 text-sm"><Link href="/" className="text-accent underline-offset-4 hover:underline">Volver al dashboard</Link></p>
      </PageContainer>
    );
  }
  if (!bundle) {
    return (
      <PageContainer wide>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-10 w-[480px] max-w-full" />
        <Skeleton className="mt-8 h-8 w-full max-w-[640px]" />
        <Skeleton className="mt-6 h-[420px] w-full" />
      </PageContainer>
    );
  }

  const { project } = bundle;
  const ctx: TabCtx = {
    id,
    bundle,
    patch,
    reload: reloadBundle,
    refreshPreview,
    goTab: setTab,
    seek,
    previewSpec: previewApi.data?.spec ?? null,
  };
  const doneRender = bundle.renders.some((r) => r.status === "done");
  const tabItems: { value: TabId; label: React.ReactNode }[] = [
    { value: "research", label: <TabLabel done={Boolean(bundle.research)}>Investigación</TabLabel> },
    { value: "script", label: <TabLabel done={Boolean(bundle.script?.approvedAt)}>Guion</TabLabel> },
    { value: "storyboard", label: <TabLabel done={hasStoryboard}>Storyboard</TabLabel> },
    { value: "voice", label: <TabLabel done={Boolean(bundle.narration)}>Voz</TabLabel> },
    { value: "render", label: <TabLabel done={doneRender}>Render</TabLabel> },
    { value: "metrics", label: <TabLabel>Métricas</TabLabel> },
  ];

  const preview = (
    <PreviewPanel
      spec={previewApi.data?.spec ?? null}
      assetBaseUrl={previewApi.data?.assetBaseUrl ?? "/api/media/"}
      loading={previewApi.loading}
      error={previewApi.error}
      playerRef={playerRef}
      lastRender={bundle.renders[0] ?? null}
      hasStoryboard={hasStoryboard}
      onGoStoryboard={() => setTab("storyboard")}
    />
  );

  return (
    <PageContainer wide className="!py-8">
      <div className="mb-6 flex items-center gap-2 text-[13px] text-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg"><Icon name="chevron-left" size={14} /> Proyectos</Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <BrandTag brand={project.brand} />
            <span className="text-subtle">·</span>
            <span className="eyebrow">{TEMPLATES[project.template].name}</span>
            {project.isDemo && <DemoBadge />}
          </div>
          <EditableTitle project={project} onSave={(title) => updateProject({ title })} />
          {project.isDemo && <p className="text-[13px] text-muted">Proyecto de ejemplo con datos ficticios: no lo uses como fuente real.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={project.status} />
          <div className="w-40">
            <Select
              aria-label="Estado del proyecto"
              value={project.status}
              onChange={(e) => void changeStatus(e.target.value as ProjectStatus)}
              className="h-9 text-[13px]"
            >
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </Select>
          </div>
          {project.status === "review" && (
            <Button size="sm" onClick={() => void updateProject({ status: "approved" }).catch(() => undefined)}>
              <Icon name="check" size={14} /> Marcar aprobado
            </Button>
          )}
          {project.status === "approved" && (
            <Button size="sm" variant="secondary" onClick={() => void updateProject({ status: "exported", publishedAt: new Date().toISOString() }).catch(() => undefined)}>
              Marcar exportado
            </Button>
          )}
          {!wide && (
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Icon name="play" size={14} /> Vista previa
            </Button>
          )}
          <Button size="icon" variant="ghost" aria-label="Eliminar proyecto" onClick={() => setDeleteOpen(true)}>
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-10 min-[1320px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Tabs idBase={IDBASE} label="Pasos del proyecto" items={tabItems} value={tab} onValueChange={setTab} className="overflow-x-auto" />
          <TabPanel idBase={IDBASE} value="research" active={tab === "research"}><ResearchTab ctx={ctx} /></TabPanel>
          <TabPanel idBase={IDBASE} value="script" active={tab === "script"}><ScriptTab ctx={ctx} /></TabPanel>
          <TabPanel idBase={IDBASE} value="storyboard" active={tab === "storyboard"}><StoryboardTab ctx={ctx} /></TabPanel>
          <TabPanel idBase={IDBASE} value="voice" active={tab === "voice"}><VoiceTab ctx={ctx} /></TabPanel>
          <TabPanel idBase={IDBASE} value="render" active={tab === "render"}><RenderTab ctx={ctx} /></TabPanel>
          <TabPanel idBase={IDBASE} value="metrics" active={tab === "metrics"}><MetricsTab ctx={ctx} /></TabPanel>
        </div>
        {wide && (
          <aside aria-label="Vista previa" className="min-w-0">
            <div className="sticky top-[72px]" style={{ width: "min(340px, calc((100vh - 270px) * 0.5625))" }}>{preview}</div>
          </aside>
        )}
      </div>

      {!wide && (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title="Vista previa" size="sm">
          {previewOpen && preview}
        </Dialog>
      )}

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar proyecto"
        description={`Se borrarán “${project.title}”, su investigación, guion, storyboard, narración y renders. No se puede deshacer.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" loading={deleting} onClick={doDelete}>Eliminar definitivamente</Button>
          </>
        }
      />
    </PageContainer>
  );
}

function TabLabel({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {children}
      {done && <span aria-label="completado" className="size-1.5 rounded-full bg-success" />}
    </span>
  );
}

