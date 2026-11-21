"use client";
import * as React from "react";
import { Badge, Button, EmptyState, Field, Icon, Input, Select, Skeleton, Textarea, Tooltip, useToast } from "@/components/ui";
import {
  COMPLEXITY_LEVELS,
  CONTENT_FORMATS,
  NARRATIVE_STYLES,
  SCENE_TYPES,
  TARGET_DURATIONS,
  estimateSeconds,
  type ContentFormat,
  type Script,
  type ScriptSegment,
  type ScriptSettings,
} from "@/shared/schema";
import { SCRIPT_TEMPLATES } from "@/content/script-templates";
import { api, errorMessage } from "@/components/app/api-client";
import { InlineError } from "@/components/app/common";
import { fmtDateTime } from "@/components/app/format";
import { COMPLEXITY_LABEL, ROLE_LABEL, SCENE_LABEL, STYLE_LABEL, providerLabel } from "@/components/app/labels";
import { useHealth } from "@/components/app/health";
import type { SettingsResponse } from "@/components/app/types";
import { useApi } from "@/components/app/use-api";
import { Callout, ConfirmDialog, Mono, Panel, SaveBar } from "./ui-bits";
import type { TabCtx } from "./types";

const PLACEHOLDER_RE = /\[Completa:[^\]]*\]?/g;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function findPlaceholders(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  for (const m of text.matchAll(PLACEHOLDER_RE)) out.push({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  return out;
}

const FORMAT_BY_TEMPLATE: Record<string, ContentFormat> = { "technology-news": "launch", "ai-tutorial": "tutorial", "ai-explainer": "concept" };

export function ScriptTab({ ctx }: { ctx: TabCtx }) {
  const settings = useApi<SettingsResponse>(ctx.bundle.script ? null : "/api/settings");
  if (!ctx.bundle.script && settings.loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64" />
      </div>
    );
  }
  const defs = settings.data?.settings ?? {};
  const duration = Number(defs.defaultTargetDuration);
  const defaults: ScriptSettings = {
    targetDuration: (TARGET_DURATIONS as readonly number[]).includes(duration) ? (duration as ScriptSettings["targetDuration"]) : 45,
    format: FORMAT_BY_TEMPLATE[ctx.bundle.project.template] ?? "concept",
    audience: defs.defaultAudience || "Personas curiosas que quieren entenderlo y aplicarlo, sin conocimientos técnicos previos",
    complexity: "intermediate",
    style: "teacher",
  };
  return <ScriptInner ctx={ctx} defaults={defaults} />;
}

function ScriptInner({ ctx, defaults }: { ctx: TabCtx; defaults: ScriptSettings }) {
  const { toast } = useToast();
  const { health } = useHealth();
  const { bundle, id } = ctx;
  const script = bundle.script;
  const [form, setForm] = React.useState<ScriptSettings>(script?.settings ?? defaults);
  const [generating, setGenerating] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setConfirmOpen(false);
    setGenerating(true);
    setError(null);
    try {
      const r = await api<{ script: Script }>(`/api/projects/${id}/script`, { method: "POST", body: { settings: form } });
      ctx.patch({ script: r.script });
      ctx.reload();
      toast({
        title: "Guion generado",
        description: health?.mode === "offline" ? "Modo offline: es un esqueleto con huecos [Completa: …] por llenar." : undefined,
        tone: "success",
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  const fmt = SCRIPT_TEMPLATES[form.format];
  const set = <K extends keyof ScriptSettings>(k: K, v: ScriptSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-8">
      <Panel
        eyebrow="Paso 2"
        title="Ajustes del guion"
        description="Define la duración y el enfoque. El guion se genera con la investigación guardada como base."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Duración objetivo">
            {(ids) => (
              <Select {...ids} value={form.targetDuration} onChange={(e) => set("targetDuration", Number(e.target.value) as ScriptSettings["targetDuration"])}>
                {TARGET_DURATIONS.map((d) => <option key={d} value={d}>{d} segundos</option>)}
              </Select>
            )}
          </Field>
          <Field label="Formato" hint={fmt.description}>
            {(ids) => (
              <Select {...ids} value={form.format} onChange={(e) => set("format", e.target.value as ContentFormat)}>
                {CONTENT_FORMATS.map((f) => <option key={f} value={f}>{SCRIPT_TEMPLATES[f].name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Audiencia" className="md:col-span-2">
            {(ids) => <Input {...ids} value={form.audience} maxLength={200} onChange={(e) => set("audience", e.target.value)} />}
          </Field>
          <Field label="Complejidad">
            {(ids) => (
              <Select {...ids} value={form.complexity} onChange={(e) => set("complexity", e.target.value as ScriptSettings["complexity"])}>
                {COMPLEXITY_LEVELS.map((c) => <option key={c} value={c}>{COMPLEXITY_LABEL[c]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Estilo narrativo">
            {(ids) => (
              <Select {...ids} value={form.style} onChange={(e) => set("style", e.target.value as ScriptSettings["style"])}>
                {NARRATIVE_STYLES.map((s) => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[52ch] text-[13px] text-muted">
            {health?.mode === "offline"
              ? "Sin clave de IA: se crea un esqueleto por formato con huecos “[Completa: …]” que debes escribir tú."
              : "Con IA, el guion usa solo afirmaciones de tu investigación."}
          </p>
          <Button loading={generating} onClick={() => (script ? setConfirmOpen(true) : void generate())}>
            <Icon name="wand" size={16} /> {script ? "Generar de nuevo" : "Generar guion"}
          </Button>
        </div>
        {error && <InlineError className="mt-4" message={error} />}
      </Panel>

      {script ? (
        <SegmentEditor key={`${script.version}-${script.updatedAt}`} ctx={ctx} script={script} form={form} />
      ) : (
        <EmptyState icon={<Icon name="book" />} title="Todavía no hay guion" description="Genera un primer borrador con los ajustes de arriba. Podrás editarlo segmento por segmento." />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={generate}
        title="Generar un guion nuevo"
        description="Se creará una versión nueva con estos ajustes y se retirará la aprobación actual. La versión anterior queda en el historial."
        confirmLabel="Generar"
      />
    </div>
  );
}

function SegmentEditor({ ctx, script, form }: { ctx: TabCtx; script: Script; form: ScriptSettings }) {
  const { toast } = useToast();
  const { health } = useHealth();
  const { id } = ctx;
  const [segments, setSegments] = React.useState<ScriptSegment[]>(script.segments);
  const [saving, setSaving] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [regenId, setRegenId] = React.useState<string | null>(null);
  const [instruction, setInstruction] = React.useState("");
  const [regenerating, setRegenerating] = React.useState(false);
  const refs = React.useRef(new Map<string, HTMLTextAreaElement>());

  const dirty = JSON.stringify(segments) !== JSON.stringify(script.segments) || JSON.stringify(form) !== JSON.stringify(script.settings);
  const placeholderCount = segments.reduce((n, s) => n + findPlaceholders(s.text).length, 0);
  const emptySegments = segments.filter((s) => !s.text.trim()).length;
  const totalSeconds = segments.reduce((n, s) => n + estimateSeconds(s.text.replace(PLACEHOLDER_RE, "")), 0);
  const totalWords = segments.reduce((n, s) => n + wordCount(s.text), 0);
  const target = form.targetDuration;
  const ratio = totalSeconds / target;
  const approved = Boolean(script.approvedAt);
  const prov = providerLabel(script.provider);
  const offline = health?.mode === "offline";

  const update = (sid: string, p: Partial<ScriptSegment>) => setSegments((xs) => xs.map((s) => (s.id === sid ? { ...s, ...p } : s)));

  function payload() {
    return {
      segments: segments.map((s) => ({ ...s, text: s.text.trim(), onScreen: s.onScreen?.trim() ? s.onScreen.trim() : undefined })),
      settings: form,
    };
  }

  async function save(silent = false): Promise<Script | null> {
    setSaving(true);
    setError(null);
    try {
      const r = await api<{ script: Script }>(`/api/projects/${id}/script`, { method: "PUT", body: payload() });
      ctx.patch({ script: r.script });
      ctx.reload();
      ctx.refreshPreview();
      if (!silent) toast({ title: "Guion guardado", description: `Versión ${r.script.version}`, tone: "success" });
      return r.script;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setApproving(true);
    setError(null);
    try {
      if (dirty) {
        const saved = await save(true);
        if (!saved) return;
      }
      const r = await api<{ script: Script }>(`/api/projects/${id}/script/approve`, { method: "POST" });
      ctx.patch({ script: r.script });
      ctx.reload();
      toast({ title: "Guion aprobado", description: "El proyecto pasa a producción. Ya puedes crear el storyboard.", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setApproving(false);
    }
  }

  async function regenerate(segmentId: string) {
    setRegenerating(true);
    setError(null);
    try {
      if (dirty) {
        const saved = await save(true);
        if (!saved) return;
      }
      const r = await api<{ script: Script }>(`/api/projects/${id}/script/regenerate`, { method: "POST", body: { segmentId, instruction: instruction.trim() } });
      ctx.patch({ script: r.script });
      ctx.reload();
      setRegenId(null);
      setInstruction("");
      toast({ title: "Segmento regenerado", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRegenerating(false);
    }
  }

  function focusPlaceholder(sid: string, start: number, end: number) {
    const el = refs.current.get(sid);
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
  }

  const timeTone = ratio < 0.8 || ratio > 1.2 ? "text-gold-400" : "text-success";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow">Segmentos</span>
        <Badge variant={prov.tone}>{prov.label}</Badge>
        <Badge variant="outline">v{script.version}</Badge>
        {approved ? <Badge variant="success">Aprobado</Badge> : <Badge variant="neutral">Borrador</Badge>}
        <Mono className="ml-auto">
          <span className={timeTone}>≈ {totalSeconds.toFixed(0)} s</span> de {target} s objetivo · {totalWords} palabras
        </Mono>
      </div>

      {approved && (
        <Callout tone="success" title={`Guion aprobado el ${fmtDateTime(script.approvedAt)}`}>
          Si lo editas se crea una versión nueva y tendrás que aprobarlo otra vez.
        </Callout>
      )}
      {placeholderCount > 0 && (
        <Callout tone="gold" title={`${placeholderCount} hueco(s) por completar`}>
          Reemplaza cada marcador <span className="font-mono text-gold-400">[Completa: …]</span> con narración real. No se puede aprobar el guion mientras queden.
        </Callout>
      )}
      {ratio > 0 && (ratio < 0.8 || ratio > 1.2) && placeholderCount === 0 && (
        <Callout tone="gold" title="La duración estimada se aleja del objetivo">
          Con ≈{totalSeconds.toFixed(0)} s de narración frente a {target} s objetivo, ajusta el texto o cambia la duración objetivo.
        </Callout>
      )}

      <ol className="flex flex-col gap-5">
        {segments.map((s, i) => {
          const phs = findPlaceholders(s.text);
          const wc = wordCount(s.text);
          const sec = estimateSeconds(s.text.replace(PLACEHOLDER_RE, ""));
          const isRegen = regenId === s.id;
          return (
            <li key={s.id} className="rounded-lg border border-line bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-subtle tabular">{String(i + 1).padStart(2, "0")}</span>
                  <span className="eyebrow !text-fg">{ROLE_LABEL[s.role] ?? s.role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mono>{wc} palabras · ≈ {sec.toFixed(1)} s</Mono>
                  <Tooltip content={offline ? "Requiere IA: configura ANTHROPIC_API_KEY en .env.local" : "Reescribe este segmento con una instrucción"} side="bottom">
                    <Button variant="outline" size="sm" disabled={offline} onClick={() => { setRegenId(isRegen ? null : s.id); setInstruction(""); }} aria-expanded={isRegen}>
                      <Icon name="refresh" size={14} /> Regenerar
                    </Button>
                  </Tooltip>
                </div>
              </div>
              <div className="flex flex-col gap-4 p-5">
                {isRegen && (
                  <div className="flex items-end gap-3 rounded-lg border border-line bg-raised/40 p-3">
                    <Field label="Instrucción para este segmento" className="flex-1">
                      {(ids) => <Input {...ids} value={instruction} maxLength={500} onChange={(e) => setInstruction(e.target.value)} placeholder="Ej. Más corto y con un ejemplo cotidiano" />}
                    </Field>
                    <Button size="md" loading={regenerating} onClick={() => regenerate(s.id)}>Regenerar</Button>
                  </div>
                )}
                <Field label="Narración">
                  {(ids) => (
                    <Textarea
                      {...ids}
                      ref={(el) => {
                        if (el) refs.current.set(s.id, el);
                        else refs.current.delete(s.id);
                      }}
                      value={s.text}
                      rows={4}
                      maxLength={1200}
                      aria-invalid={phs.length > 0 || !s.text.trim() ? true : undefined}
                      onChange={(e) => update(s.id, { text: e.target.value })}
                      className={phs.length > 0 ? "!border-gold-400/70" : undefined}
                    />
                  )}
                </Field>
                {phs.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {phs.map((p, k) => (
                      <li key={k} className="flex items-center gap-3 rounded-md border border-gold-400/40 bg-gold-400/[0.07] px-3 py-1.5">
                        <Icon name="alert" size={14} className="shrink-0 text-gold-400" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-gold-400">{p.text}</span>
                        <button type="button" onClick={() => focusPlaceholder(s.id, p.start, p.end)} className="shrink-0 text-[12px] text-gold-400 underline underline-offset-4">
                          Ir al hueco
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Field label="Texto en pantalla (opcional)">
                    {(ids) => <Input {...ids} value={s.onScreen ?? ""} maxLength={140} onChange={(e) => update(s.id, { onScreen: e.target.value })} placeholder="Frase breve que se verá en el video" />}
                  </Field>
                  <Field label="Escena sugerida">
                    {(ids) => (
                      <Select {...ids} value={s.visualHint ?? ""} onChange={(e) => update(s.id, { visualHint: (e.target.value || undefined) as ScriptSegment["visualHint"] })}>
                        <option value="">Automática</option>
                        {SCENE_TYPES.map((t) => <option key={t} value={t}>{SCENE_LABEL[t]}</option>)}
                      </Select>
                    )}
                  </Field>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {error && <InlineError message={error} />}

      <SaveBar
        dirty={dirty}
        note={
          placeholderCount > 0
            ? `Aprobación bloqueada: ${placeholderCount} hueco(s) [Completa: …].`
            : emptySegments > 0
              ? "Hay segmentos vacíos."
              : undefined
        }
      >
        <Button variant="secondary" onClick={() => void save()} loading={saving} disabled={!dirty || emptySegments > 0}>Guardar</Button>
        {approved && !dirty ? (
          <Button onClick={() => ctx.goTab("storyboard")}>Continuar al storyboard <Icon name="chevron-right" size={14} /></Button>
        ) : (
          <Tooltip content={placeholderCount > 0 ? "Completa los huecos antes de aprobar" : "Aprueba para habilitar el storyboard"} side="top">
            <Button onClick={approve} loading={approving} disabled={placeholderCount > 0 || emptySegments > 0}>
              <Icon name="check" size={14} /> Aprobar guion
            </Button>
          </Tooltip>
        )}
      </SaveBar>

      {ctx.bundle.scriptVersions.length > 0 && (
        <Panel eyebrow="Historial" title="Versiones del guion">
          <ul className="divide-y divide-line">
            {ctx.bundle.scriptVersions.map((v) => (
              <li key={v.version} className="flex items-center gap-4 py-2.5 text-[13px]">
                <Badge variant={v.version === script.version ? "accent" : "neutral"}>v{v.version}</Badge>
                <span className="text-muted">{providerLabel(v.provider).label}</span>
                <Mono className="ml-auto">{fmtDateTime(v.createdAt)}</Mono>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
