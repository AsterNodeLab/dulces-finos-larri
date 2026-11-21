"use client";
import * as React from "react";
import { Badge, Button, EmptyState, Field, Icon, Input, Select, Textarea, useToast } from "@/components/ui";
import {
  SCENE_TYPES,
  SceneSchema,
  TransitionSchema,
  CameraSchema,
  VideoSpecSchema,
  totalDurationInFrames,
  type Asset,
  type Scene,
  type SceneType,
  type VideoSpec,
} from "@/shared/schema";
import { cn } from "@/lib/utils";
import { api, ApiError, errorMessage, type ApiIssue } from "@/components/app/api-client";
import { useHealth } from "@/components/app/health";
import { fmtDateTime, fmtSeconds } from "@/components/app/format";
import { CAMERA_LABEL, SCENE_LABEL, TRANSITION_LABEL } from "@/components/app/labels";
import type { StoryboardInfo } from "@/components/app/types";
import { useApi } from "@/components/app/use-api";
import { Callout, ConfirmDialog, Mono, Panel, SaveBar } from "./ui-bits";
import { PROPS_SCHEMAS, createScene, newSceneId, sceneHeadline } from "./scene-defaults";
import { FieldControl, Toggle, cleanObject, describe, propLabel, type Desc, type FieldEnv } from "./scene-fields";
import type { TabCtx } from "./types";

/* ───────── Mensajes de validación en español ───────── */

function humanizeMessage(m: string): string {
  let r = m.match(/<=\s*(\d+)\s*characters/);
  if (r) return `máximo ${r[1]} caracteres`;
  r = m.match(/>=\s*(\d+)\s*characters/);
  if (r) return r[1] === "1" ? "no puede estar vacío" : `mínimo ${r[1]} caracteres`;
  r = m.match(/<=\s*(\d+)\s*items/);
  if (r) return `máximo ${r[1]} elementos`;
  r = m.match(/>=\s*(\d+)\s*items/);
  if (r) return `mínimo ${r[1]} elementos`;
  if (/expected string, received undefined|Invalid input: expected string/.test(m)) return "campo obligatorio";
  if (/expected number/.test(m)) return "debe ser un número";
  if (/Too big/.test(m)) return "valor demasiado grande";
  if (/Too small/.test(m)) return "valor demasiado pequeño";
  return m;
}

function humanizePath(path: string, scenes: Scene[]): string {
  const parts = path.split(".").filter(Boolean);
  if (parts[0] !== "scenes") return parts.map(propLabel).join(" › ") || "spec";
  const idx = Number(parts[1]);
  const scene = scenes[idx];
  const rest = parts.slice(2).filter((p) => p !== "props").map((p) => (/^\d+$/.test(p) ? `#${Number(p) + 1}` : propLabel(p)));
  return [`Escena ${idx + 1}${scene ? ` (${SCENE_LABEL[scene.type]})` : ""}`, ...rest].join(" › ");
}

/* ───────── Pestaña ───────── */

export function StoryboardTab({ ctx }: { ctx: TabCtx }) {
  const { toast } = useToast();
  const { health } = useHealth();
  const { bundle, id } = ctx;
  const sb = bundle.storyboard;
  const approved = Boolean(bundle.script?.approvedAt);
  const [creating, setCreating] = React.useState(false);
  const [useAi, setUseAi] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rejected, setRejected] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  async function create() {
    setConfirm(false);
    setCreating(true);
    setError(null);
    try {
      const r = await api<{ storyboard: StoryboardInfo }>(`/api/projects/${id}/storyboard`, { method: "POST", body: { useAi: useAi && health?.mode === "ai" } });
      ctx.patch({ storyboard: r.storyboard });
      setRejected(r.storyboard.rejected ?? 0);
      setSelectedId(null);
      ctx.reload();
      ctx.refreshPreview();
      toast({ title: "Storyboard creado", description: `${r.storyboard.spec.scenes.length} escenas`, tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  const aiOption =
    health?.mode === "ai" ? (
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted select-none">
        <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
        Usar IA (Motion Director)
      </label>
    ) : (
      <span className="text-[12px] text-subtle">Sin IA: se arma de forma determinista desde la plantilla.</span>
    );

  if (!sb) {
    if (!approved) {
      return (
        <EmptyState
          icon={<Icon name="layers" size={20} />}
          title="Aprueba el guion primero"
          description="El storyboard se construye a partir del guion aprobado: cada segmento se convierte en una escena."
          action={<Button onClick={() => ctx.goTab("script")}>Ir al guion</Button>}
        />
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <Panel eyebrow="Paso 3" title="Crear storyboard" description="Cada segmento del guion se convierte en una escena animada con el tipo recomendado por la plantilla. Después podrás editar cualquier texto, duración o escena.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {aiOption}
            <Button loading={creating} onClick={create}><Icon name="layers" size={16} /> Crear storyboard</Button>
          </div>
          {error && <Callout tone="danger" className="mt-4">{error}</Callout>}
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">Storyboard</span>
          <Badge variant="neutral">{sb.provider}</Badge>
          <Mono>Guardado {fmtDateTime(sb.updatedAt)}</Mono>
        </div>
        <div className="flex items-center gap-4">
          {approved && aiOption}
          {approved && <Button variant="outline" size="sm" loading={creating} onClick={() => setConfirm(true)}>Recrear desde el guion</Button>}
        </div>
      </div>
      {error && <Callout tone="danger">{error}</Callout>}
      {rejected > 0 && <Callout tone="gold" title={`${rejected} escena(s) de la IA descartadas`}>La IA propuso escenas que no cumplían el esquema; se reemplazaron por las de la plantilla.</Callout>}
      <StoryboardEditor key={sb.updatedAt} ctx={ctx} storyboard={sb} selectedId={selectedId} setSelectedId={setSelectedId} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={create}
        title="Recrear el storyboard"
        description="Se descartan todas tus ediciones del storyboard actual y se vuelve a generar desde el guion aprobado."
        confirmLabel="Recrear"
        tone="danger"
      />
    </div>
  );
}

/* ───────── Editor ───────── */

function StoryboardEditor({
  ctx,
  storyboard,
  selectedId,
  setSelectedId,
}: {
  ctx: TabCtx;
  storyboard: StoryboardInfo;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
}) {
  const { toast } = useToast();
  const { id, bundle } = ctx;
  const [draft, setDraft] = React.useState<VideoSpec>(storyboard.spec);
  const [saving, setSaving] = React.useState(false);
  const [issues, setIssues] = React.useState<ApiIssue[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [addType, setAddType] = React.useState<SceneType>("EditorialTitle");
  const assets = useApi<{ assets: Asset[] }>(`/api/assets?brand=${bundle.project.brand}`);

  const dirty = JSON.stringify(draft) !== JSON.stringify(storyboard.spec);
  const selected = draft.scenes.find((s) => s.id === selectedId) ?? draft.scenes[0];
  const musicAssets = (assets.data?.assets ?? []).filter((a) => a.kind === "music");
  const env: FieldEnv = {
    characterAssets: (assets.data?.assets ?? []).filter((a) => a.kind.startsWith("character-")).map((a) => ({ value: a.filePath, label: `${a.label} (${a.kind.replace("character-", "")})` })),
  };

  const invalidIds = new Set(draft.scenes.filter((s) => !SceneSchema.safeParse(s).success).map((s) => s.id));
  const totalFrames = totalDurationInFrames(draft);

  function startFrame(sceneId: string): number {
    const src = ctx.previewSpec?.scenes.some((s) => s.id === sceneId) ? ctx.previewSpec.scenes : draft.scenes;
    let f = 0;
    for (const s of src) {
      if (s.id === sceneId) break;
      f += s.durationInFrames;
    }
    return f;
  }

  function select(sceneId: string) {
    setSelectedId(sceneId);
    ctx.seek(startFrame(sceneId));
  }

  const setScenes = (scenes: Scene[]) => setDraft((d) => ({ ...d, scenes }));
  const updateScene = (sid: string, patch: Partial<Scene>) => setDraft((d) => ({ ...d, scenes: d.scenes.map((s) => (s.id === sid ? ({ ...s, ...patch } as Scene) : s)) }));

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= draft.scenes.length) return;
    const next = [...draft.scenes];
    [next[index], next[j]] = [next[j], next[index]];
    setScenes(next);
  }
  function duplicate(index: number) {
    const src = draft.scenes[index];
    const copy = { ...structuredClone(src), id: newSceneId() } as Scene;
    const next = [...draft.scenes];
    next.splice(index + 1, 0, copy);
    setScenes(next);
    setSelectedId(copy.id);
  }
  function remove(index: number) {
    if (draft.scenes.length <= 1) return;
    const next = draft.scenes.filter((_, i) => i !== index);
    setScenes(next);
    setSelectedId(next[Math.min(index, next.length - 1)].id);
  }
  function add() {
    const scene = createScene(addType);
    const at = selected ? draft.scenes.findIndex((s) => s.id === selected.id) + 1 : draft.scenes.length;
    const next = [...draft.scenes];
    next.splice(at, 0, scene);
    setScenes(next);
    setSelectedId(scene.id);
  }

  async function save() {
    setError(null);
    const parsed = VideoSpecSchema.safeParse(draft);
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      setError("Corrige los campos marcados antes de guardar.");
      return;
    }
    setIssues([]);
    setSaving(true);
    try {
      const r = await api<{ storyboard: StoryboardInfo }>(`/api/projects/${id}/storyboard`, { method: "PUT", body: { spec: parsed.data } });
      ctx.patch({ storyboard: r.storyboard });
      ctx.reload();
      ctx.refreshPreview();
      toast({ title: "Storyboard guardado", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setIssues(e.issues);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="@container">
        <div className="grid gap-5 @3xl:grid-cols-[250px_minmax(0,1fr)]">
          {/* Lista de escenas */}
          <section aria-label="Escenas" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">{draft.scenes.length} escenas</span>
              <Mono>{fmtSeconds(totalFrames / draft.fps)}</Mono>
            </div>
            <ol className="flex flex-col gap-1.5">
              {draft.scenes.map((s, i) => {
                const active = s.id === selected?.id;
                const bad = invalidIds.has(s.id);
                return (
                  <li key={s.id} className={cn("rounded-lg border transition-colors duration-150", active ? "border-accent bg-raised/60" : "border-line hover:border-line-strong")}>
                    <button type="button" onClick={() => select(s.id)} aria-current={active ? "true" : undefined} className="flex w-full items-start gap-3 px-3 pt-2.5 pb-1.5 text-left">
                      <span className="mt-0.5 font-mono text-[11px] text-subtle tabular">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[12px] font-medium">{SCENE_LABEL[s.type]}</span>
                          {bad && <span title="Esta escena tiene campos inválidos" className="size-1.5 shrink-0 rounded-full bg-danger" />}
                        </span>
                        <span className="line-clamp-1 text-[12px] text-muted">{sceneHeadline(s) || "Sin título"}</span>
                      </span>
                      <span className="font-mono text-[10px] text-subtle tabular">{(s.durationInFrames / draft.fps).toFixed(1)}s</span>
                    </button>
                    <div className="flex items-center justify-end gap-0.5 px-1.5 pb-1.5">
                      <IconBtn label={`Subir escena ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)} icon="chevron-left" rotate="rotate-90" />
                      <IconBtn label={`Bajar escena ${i + 1}`} disabled={i === draft.scenes.length - 1} onClick={() => move(i, 1)} icon="chevron-left" rotate="-rotate-90" />
                      <IconBtn label={`Duplicar escena ${i + 1}`} onClick={() => duplicate(i)} icon="layers" />
                      <IconBtn label={`Eliminar escena ${i + 1}`} disabled={draft.scenes.length <= 1} onClick={() => remove(i)} icon="trash" danger />
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <Select aria-label="Tipo de escena nueva" value={addType} onChange={(e) => setAddType(e.target.value as SceneType)} className="h-9 text-[13px]">
                {SCENE_TYPES.map((t) => <option key={t} value={t}>{SCENE_LABEL[t]}</option>)}
              </Select>
              <Button variant="secondary" size="sm" onClick={add} className="shrink-0"><Icon name="plus" size={14} /> Escena</Button>
            </div>
          </section>

          {/* Formulario de la escena */}
          {selected && (
            <SceneForm
              key={selected.id}
              scene={selected}
              fps={draft.fps}
              env={env}
              hasNarration={Boolean(bundle.narration)}
              onChange={(p) => updateScene(selected.id, p)}
            />
          )}
        </div>
      </div>

      <GlobalSettings draft={draft} setDraft={setDraft} musicAssets={musicAssets} hasNarration={Boolean(bundle.narration)} />

      {issues.length > 0 && (
        <Callout tone="danger" title={`${issues.length} problema(s) de validación`}>
          <ul className="mt-1 flex flex-col gap-1">
            {issues.slice(0, 12).map((i, k) => (
              <li key={k}><span className="text-fg">{humanizePath(i.path, draft.scenes)}</span>: {humanizeMessage(i.message)}</li>
            ))}
          </ul>
        </Callout>
      )}
      {error && issues.length === 0 && <Callout tone="danger">{error}</Callout>}

      <SaveBar dirty={dirty}>
        <Button variant="ghost" onClick={() => ctx.goTab("voice")}>Continuar a la voz</Button>
        <Button onClick={save} loading={saving} disabled={!dirty}>Guardar storyboard</Button>
      </SaveBar>
    </div>
  );
}

function IconBtn({ label, onClick, icon, disabled, danger, rotate }: { label: string; onClick: () => void; icon: "chevron-left" | "layers" | "trash"; disabled?: boolean; danger?: boolean; rotate?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("rounded-sm p-1.5 text-subtle transition-colors hover:bg-raised disabled:opacity-30 disabled:hover:bg-transparent", danger ? "hover:text-danger" : "hover:text-fg")}
    >
      <Icon name={icon} size={14} className={rotate} />
    </button>
  );
}

/* ───────── Formulario de escena ───────── */

function SceneForm({
  scene,
  fps,
  env,
  hasNarration,
  onChange,
}: {
  scene: Scene;
  fps: number;
  env: FieldEnv;
  hasNarration: boolean;
  onChange: (p: Partial<Scene>) => void;
}) {
  const propsDesc = describe(PROPS_SCHEMAS[scene.type]) as Extract<Desc, { kind: "object" }>;
  const props = scene.props as Record<string, unknown>;
  const result = SceneSchema.safeParse(scene);
  const sceneIssues = result.success ? [] : result.error.issues.map((i) => ({ path: i.path.filter((p) => p !== "props").map(String).join(" › "), message: i.message }));
  return (
    <section aria-label={`Escena: ${SCENE_LABEL[scene.type]}`} className="@container flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Escena</span>
          <h3 className="font-serif text-xl leading-7 font-medium">{SCENE_LABEL[scene.type]}</h3>
        </div>
        <Badge variant="neutral" className="font-mono">{scene.id}</Badge>
      </div>

      {sceneIssues.length > 0 && (
        <Callout tone="danger" title="Campos por corregir">
          <ul className="mt-1 flex flex-col gap-0.5">
            {sceneIssues.slice(0, 6).map((i, k) => <li key={k}><span className="text-fg">{i.path.split(" › ").map(propLabel).join(" › ") || "Escena"}</span>: {humanizeMessage(i.message)}</li>)}
          </ul>
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        {propsDesc.fields.map(([k, d]) => (
          <div key={k} className={d.kind === "array" || (d.kind === "string" && (d.max ?? 0) > 100) ? "@xl:col-span-2" : undefined}>
            <FieldControl
              name={k}
              desc={d}
              value={props[k]}
              env={env}
              onChange={(v) => onChange({ props: cleanObject({ ...props, [k]: v }) } as Partial<Scene>)}
            />
          </div>
        ))}
      </div>

      <hr className="border-line" />

      <div className="flex flex-col gap-4">
        <span className="eyebrow">Narración y tiempo</span>
        <Field label="Narración de esta escena" hint={hasNarration ? "Texto que se dice mientras se ve esta escena." : "Texto que se dice en esta escena. Aún no hay audio cargado."}>
          {(ids) => <Textarea {...ids} value={scene.narration} maxLength={1200} rows={3} onChange={(e) => onChange({ narration: e.target.value })} className="text-[13px]" />}
        </Field>
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-[170px_minmax(0,1fr)]">
          <Field label="Duración (frames)" hint={`${(scene.durationInFrames / fps).toFixed(2)} s a ${fps} fps`}>
            {(ids) => (
              <Input
                {...ids}
                type="number"
                min={15}
                max={3600}
                step={1}
                value={scene.durationInFrames}
                onChange={(e) => onChange({ durationInFrames: Math.max(0, Math.round(Number(e.target.value) || 0)), lockedDuration: true })}
                className="h-9 text-[13px]"
              />
            )}
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-md border border-line px-3 py-2.5">
            <div>
              <span className="text-[13px]">Duración fija</span>
              <p className="text-[11px] text-subtle">{hasNarration ? "Si está activa, la sincronía con la voz no cambia esta duración." : "Con voz cargada, las duraciones se ajustan solas salvo las fijas."}</p>
            </div>
            <Toggle checked={scene.lockedDuration} onChange={(v) => onChange({ lockedDuration: v })} label="Duración fija" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Field label="Transición de entrada">
            {(ids) => (
              <Select {...ids} value={scene.transition} onChange={(e) => onChange({ transition: e.target.value as Scene["transition"] })} className="h-9 text-[13px]">
                {TransitionSchema.options.map((t) => <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Cámara">
            {(ids) => (
              <Select {...ids} value={scene.camera} onChange={(e) => onChange({ camera: e.target.value as Scene["camera"] })} className="h-9 text-[13px]">
                {CameraSchema.options.map((c) => <option key={c} value={c}>{CAMERA_LABEL[c]}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}

/* ───────── Ajustes globales ───────── */

function GlobalSettings({
  draft,
  setDraft,
  musicAssets,
  hasNarration,
}: {
  draft: VideoSpec;
  setDraft: React.Dispatch<React.SetStateAction<VideoSpec>>;
  musicAssets: Asset[];
  hasNarration: boolean;
}) {
  const [kw, setKw] = React.useState("");
  const cap = draft.captions;
  const setCap = (p: Partial<VideoSpec["captions"]>) => setDraft((d) => ({ ...d, captions: { ...d.captions, ...p } }));
  function addKeyword() {
    const v = kw.trim();
    if (!v || cap.keywords.includes(v)) return setKw("");
    setCap({ keywords: [...cap.keywords, v] });
    setKw("");
  }
  const musicSrc = draft.music?.src ?? "";
  const [open, setOpen] = React.useState(false);
  const summary = `${draft.fps} fps · subtítulos ${cap.enabled ? "activados" : "desactivados"} · ${draft.music ? "con música" : "sin música"}`;
  return (
    <Panel
      eyebrow="Global"
      title="Video, subtítulos y música"
      description={summary}
      actions={
        <Button variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Ocultar ajustes" : "Editar ajustes"}
        </Button>
      }
    >
      {open && <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título del video" className="md:col-span-2">
          {(ids) => <Input {...ids} value={draft.title} maxLength={140} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />}
        </Field>
        <Field label="Cuadros por segundo" hint="Cambiarlo no reescala las duraciones en frames; revisa los tiempos.">
          {(ids) => (
            <Select {...ids} value={draft.fps} onChange={(e) => setDraft((d) => ({ ...d, fps: Number(e.target.value) as 30 | 60 }))}>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </Select>
          )}
        </Field>
        <Field label="Audio de narración" hint={hasNarration ? "Se toma de la pestaña Voz." : "Aún no hay narración (pestaña Voz)."}>
          {(ids) => <Input {...ids} readOnly value={draft.audio ? `${draft.audio.src.split("/").pop()} · ${draft.audio.durationInSeconds.toFixed(1)} s` : "Sin audio"} />}
        </Field>

        <div className="flex flex-col gap-3 md:col-span-2">
          <span className="eyebrow">Subtítulos</span>
          <div className="grid items-end gap-4 md:grid-cols-[auto_1fr_1fr]">
            <div className="flex items-center gap-3 pb-2">
              <Toggle checked={cap.enabled} onChange={(v) => setCap({ enabled: v })} label="Subtítulos activados" />
              <span className="text-[13px]">Activados</span>
            </div>
            <Field label="Posición">
              {(ids) => (
                <Select {...ids} value={cap.position} onChange={(e) => setCap({ position: e.target.value as "lower" | "middle" })}>
                  <option value="lower">Zona inferior</option>
                  <option value="middle">Tercio medio</option>
                </Select>
              )}
            </Field>
            <Field label="Máx. caracteres por línea (14–36)">
              {(ids) => <Input {...ids} type="number" min={14} max={36} value={cap.maxCharsPerLine} onChange={(e) => setCap({ maxCharsPerLine: Math.round(Number(e.target.value) || 14) })} />}
            </Field>
          </div>
          <Field label="Palabras clave resaltadas" hint="Pulsa Enter para añadir. Se comparan sin acentos ni mayúsculas.">
            {(ids) => (
              <div className="flex flex-col gap-2">
                <Input {...ids} value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} maxLength={40} placeholder="Ej. agente" />
                {cap.keywords.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {cap.keywords.map((k) => (
                      <li key={k}>
                        <button type="button" onClick={() => setCap({ keywords: cap.keywords.filter((x) => x !== k) })} aria-label={`Quitar palabra clave ${k}`} className="inline-flex items-center gap-1.5 rounded-sm border border-accent/35 bg-accent/10 px-2 py-0.5 text-[12px] text-accent hover:border-danger/50 hover:text-danger">
                          {k} <Icon name="x" size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-3 md:col-span-2">
          <span className="eyebrow">Música de fondo</span>
          <div className="grid items-end gap-4 md:grid-cols-2">
            <Field label="Pista" hint={musicAssets.length === 0 ? "No hay música de esta marca. Súbela en Recursos de marca (requiere nota de licencia)." : undefined}>
              {(ids) => (
                <Select
                  {...ids}
                  value={musicSrc}
                  onChange={(e) => setDraft((d) => ({ ...d, music: e.target.value ? { src: e.target.value, volume: d.music?.volume ?? 0.12 } : undefined }))}
                >
                  <option value="">Sin música</option>
                  {musicAssets.map((a) => <option key={a.id} value={a.filePath}>{a.label}</option>)}
                  {musicSrc && !musicAssets.some((a) => a.filePath === musicSrc) && <option value={musicSrc}>{musicSrc}</option>}
                </Select>
              )}
            </Field>
            {draft.music && (
              <Field label={`Volumen · ${Math.round(draft.music.volume * 100)}%`}>
                {(ids) => (
                  <input
                    {...ids}
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={Math.min(0.5, draft.music!.volume)}
                    onChange={(e) => setDraft((d) => (d.music ? { ...d, music: { ...d.music, volume: Number(e.target.value) } } : d))}
                    className="h-9 w-full accent-[var(--color-accent)]"
                  />
                )}
              </Field>
            )}
          </div>
        </div>
      </div>}
    </Panel>
  );
}

