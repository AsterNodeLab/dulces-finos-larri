"use client";
import * as React from "react";
import { Badge, Button, EmptyState, Field, Icon, Input, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import type { Claim, Research, Source } from "@/shared/schema";
import { BRANDS } from "@/shared/brands";
import { api, errorMessage } from "@/components/app/api-client";
import { InlineError } from "@/components/app/common";
import { fmtDate } from "@/components/app/format";
import { CLAIM_STATUS_LABEL, SOURCE_KIND_LABEL, providerLabel } from "@/components/app/labels";
import type { RadarResponse } from "@/components/app/types";
import { useApi } from "@/components/app/use-api";
import { Callout, Panel, SaveBar, newKey } from "./ui-bits";
import type { TabCtx } from "./types";

type InputKind = "url" | "text" | "question";
interface DraftInput {
  key: string;
  kind: InputKind;
  value: string;
  title?: string;
}

const KIND_LABEL: Record<InputKind, string> = { url: "URL", text: "Texto pegado", question: "Pregunta" };

export function ResearchTab({ ctx }: { ctx: TabCtx }) {
  const { bundle, id } = ctx;
  const { toast } = useToast();
  const research = bundle.research;
  const [inputs, setInputs] = React.useState<DraftInput[]>([]);
  const [kind, setKind] = React.useState<InputKind>("text");
  const [value, setValue] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [replace, setReplace] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<{ added: number; errors: { input: string; error: string }[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function addInput(i: Omit<DraftInput, "key">) {
    setInputs((xs) => (xs.some((x) => x.kind === i.kind && x.value === i.value) ? xs : [...xs, { ...i, key: newKey("in") }]));
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    addInput({ kind, value: v, title: kind === "text" && title.trim() ? title.trim() : undefined });
    setValue("");
    setTitle("");
  }

  async function run() {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const body = { inputs: inputs.map(({ kind, value, title }) => ({ kind, value, ...(title ? { title } : {}) })), mode: replace ? "replace" : "append" };
      const r = await api<{ research: Research; report: { added: number; errors: { input: string; error: string }[] } }>(`/api/projects/${id}/research`, { method: "POST", body });
      ctx.patch({ research: r.research });
      setReport(r.report);
      setInputs([]);
      ctx.reload();
      toast({
        title: r.report.errors.length ? "Investigación actualizada con avisos" : "Investigación lista",
        description: `${r.report.added} fuente(s) añadida(s).`,
        tone: r.report.errors.length ? "neutral" : "success",
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Panel
        eyebrow="Paso 1"
        title="Fuentes de la investigación"
        description="Agrega URLs, pega texto de un artículo o formula una pregunta. Solo se usan fuentes que tú aportas: no se inventan datos, fechas ni cifras."
      >
        <form onSubmit={submitDraft} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
            <Field label="Tipo de entrada">
              {(ids) => (
                <Select {...ids} value={kind} onChange={(e) => setKind(e.target.value as InputKind)}>
                  {(Object.keys(KIND_LABEL) as InputKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </Select>
              )}
            </Field>
            {kind === "text" ? (
              <Field label="Texto" hint="Pega el cuerpo del artículo, comunicado o documento.">
                {(ids) => <Textarea {...ids} value={value} onChange={(e) => setValue(e.target.value)} rows={5} maxLength={20000} placeholder="Pega aquí el texto de la fuente…" />}
              </Field>
            ) : (
              <Field label={kind === "url" ? "URL" : "Pregunta"} hint={kind === "url" ? "Se descarga el contenido público de la página." : "Se registra como pregunta guía; no es una fuente."}>
                {(ids) => (
                  <Input
                    {...ids}
                    type={kind === "url" ? "url" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={kind === "url" ? "https://…" : "¿Qué cambia respecto a la versión anterior?"}
                  />
                )}
              </Field>
            )}
          </div>
          {kind === "text" && (
            <Field label="Título del texto (opcional)" className="md:ml-[176px]">
              {(ids) => <Input {...ids} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="Ej. Comunicado oficial del 12 de marzo" />}
            </Field>
          )}
          <div>
            <Button type="submit" variant="secondary" size="sm" disabled={!value.trim()}>
              <Icon name="plus" size={14} /> Agregar a la lista
            </Button>
          </div>
        </form>

        {inputs.length > 0 && (
          <ul className="mt-6 flex flex-col divide-y divide-line rounded-lg border border-line" aria-label="Entradas por analizar">
            {inputs.map((i) => (
              <li key={i.key} className="flex items-center gap-3 px-4 py-2.5">
                <Badge variant="neutral">{KIND_LABEL[i.kind]}</Badge>
                <span className="min-w-0 flex-1 truncate text-[13px]">{i.title ? `${i.title} · ` : ""}{i.value}</span>
                <button type="button" aria-label="Quitar entrada" onClick={() => setInputs((xs) => xs.filter((x) => x.key !== i.key))} className="rounded-sm p-1 text-muted hover:text-fg">
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted select-none">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
            Reemplazar la investigación actual (si no, se añaden a la existente)
          </label>
          <Button onClick={run} loading={running} disabled={inputs.length === 0}>
            <Icon name="search" size={16} /> {research ? "Analizar y actualizar" : "Analizar fuentes"}
          </Button>
        </div>

        {error && <InlineError className="mt-4" message={error} />}
        {report && report.errors.length > 0 && (
          <Callout tone="gold" title={`${report.errors.length} entrada(s) con problemas`} className="mt-4">
            <ul className="mt-1 flex flex-col gap-1">
              {report.errors.map((er, i) => (
                <li key={i}><span className="font-mono text-[12px] break-all text-fg">{er.input.slice(0, 80)}</span> — {er.error}</li>
              ))}
            </ul>
          </Callout>
        )}
      </Panel>

      <RadarPanel brand={bundle.project.brand} onUse={(it) => addInput({ kind: "url", value: it.url, title: it.title })} />

      {research ? (
        <ResearchEditor key={research.updatedAt} ctx={ctx} research={research} />
      ) : (
        <EmptyState
          icon={<Icon name="search" size={20} />}
          title="Aún no hay investigación"
          description="Agrega al menos una fuente arriba y pulsa “Analizar fuentes”. También puedes pasar directo al guion si ya conoces el tema."
          action={<Button variant="secondary" onClick={() => ctx.goTab("script")}>Ir al guion</Button>}
        />
      )}
    </div>
  );
}

function RadarPanel({ brand, onUse }: { brand: "vision-one" | "visionquant"; onUse: (i: { title: string; url: string }) => void }) {
  const [enabled, setEnabled] = React.useState(false);
  const [force, setForce] = React.useState(0);
  const [allBrands, setAllBrands] = React.useState(false);
  const radar = useApi<RadarResponse>(enabled ? `/api/radar${force ? "?force=1" : ""}` : null);
  const items = (radar.data?.items ?? []).filter((i) => allBrands || i.brand === brand).slice(0, 30);
  const failed = (radar.data?.feeds ?? []).filter((f) => !f.ok);
  return (
    <Panel
      eyebrow="Opcional"
      title="Radar de noticias"
      description={`Titulares recientes de feeds públicos de ${BRANDS[brand].name}. Úsalos como punto de partida, no como fuente verificada.`}
      actions={
        enabled ? (
          <Button variant="secondary" size="sm" onClick={() => setForce((f) => f + 1)} loading={radar.loading}>
            <Icon name="refresh" size={14} /> Actualizar
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setEnabled(true)}>Consultar radar</Button>
        )
      }
    >
      {!enabled ? (
        <p className="text-[13px] text-muted">El radar consulta feeds por internet solo cuando lo pides.</p>
      ) : radar.loading && !radar.data ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      ) : radar.error ? (
        <InlineError message={radar.error} />
      ) : (
        <>
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-[13px] text-muted select-none">
            <input type="checkbox" checked={allBrands} onChange={(e) => setAllBrands(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
            Incluir feeds de la otra marca
          </label>
          {items.length === 0 ? (
            <p className="text-[13px] text-muted">No hay titulares disponibles ahora mismo.</p>
          ) : (
            <ul className="max-h-[340px] divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {items.map((it) => (
                <li key={it.url} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{it.title}</p>
                    <p className="font-mono text-[11px] text-subtle">{it.feed} · {fmtDate(it.publishedAt, "fecha no determinada")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onUse(it)}>Usar como fuente</Button>
                </li>
              ))}
            </ul>
          )}
          {failed.length > 0 && (
            <p className="mt-3 text-xs text-subtle">
              {failed.length} feed(s) no respondieron: {failed.map((f) => f.label).join(", ")}.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

function ResearchEditor({ ctx, research }: { ctx: TabCtx; research: Research }) {
  const { toast } = useToast();
  const [summary, setSummary] = React.useState(research.summary);
  const [sources, setSources] = React.useState<Source[]>(research.sources);
  const [claims, setClaims] = React.useState<Claim[]>(research.claims);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prov = providerLabel(research.provider);

  const dirty = summary !== research.summary || JSON.stringify(sources) !== JSON.stringify(research.sources) || JSON.stringify(claims) !== JSON.stringify(research.claims);
  const invalid = claims.some((c) => !c.text.trim());
  const counts = {
    verified: claims.filter((c) => c.status === "verified").length,
    unverified: claims.filter((c) => c.status === "unverified").length,
    disputed: claims.filter((c) => c.status === "disputed").length,
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await api<{ research: Research }>(`/api/projects/${ctx.id}/research`, {
        method: "PUT",
        body: { summary, angles: research.angles, sources, claims: claims.map((c) => ({ ...c, text: c.text.trim() })) },
      });
      ctx.patch({ research: r.research });
      ctx.reload();
      toast({ title: "Investigación guardada", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const updateClaim = (cid: string, p: Partial<Claim>) => setClaims((xs) => xs.map((c) => (c.id === cid ? { ...c, ...p } : c)));
  const updateSource = (sid: string, p: Partial<Source>) => setSources((xs) => xs.map((s) => (s.id === sid ? { ...s, ...p } : s)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow">Resultados</span>
        <Badge variant={prov.tone}>{prov.label}</Badge>
        {research.isDemo && <Badge variant="demo">Demo</Badge>}
        <span className="font-mono text-[11px] text-subtle">Actualizado {fmtDate(research.updatedAt)}</span>
      </div>

      {prov.unverified && (
        <Callout tone="gold" title="Análisis offline: sin verificar">
          No hay clave de IA configurada, así que las afirmaciones se extrajeron literalmente de tus fuentes y quedan como “no verificadas”. Revísalas una por una (y corrige su estado) antes de aprobar el guion.
        </Callout>
      )}
      {research.isDemo && <Callout tone="gold" title="Datos de demostración">Esta investigación es ficticia y sirve solo para mostrar el flujo.</Callout>}

      <Panel eyebrow="Síntesis" title="Resumen">
        <Field label="Resumen editable">
          {(ids) => <Textarea {...ids} value={summary} onChange={(e) => setSummary(e.target.value)} rows={6} maxLength={4000} placeholder="Resume lo que dicen las fuentes, sin añadir datos que no estén en ellas." />}
        </Field>
      </Panel>

      {research.angles.length > 0 && (
        <Panel eyebrow={`${research.angles.length} propuestas`} title="Ángulos posibles">
          <ul className="grid gap-3 md:grid-cols-2">
            {research.angles.map((a, i) => (
              <li key={i} className="rounded-lg border border-line p-4">
                <p className="font-serif text-lg leading-6 font-medium">{a.title}</p>
                <p className="mt-1 text-[13px] text-muted">{a.rationale}</p>
                <Badge variant="neutral" className="mt-3">{a.format}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel eyebrow={`${sources.length} fuente(s)`} title="Fuentes">
        {sources.length === 0 ? (
          <p className="text-[13px] text-muted">Sin fuentes. Agrega entradas arriba.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-line bg-raised/40 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-normal">Fuente</th>
                  <th className="px-3 py-2.5 font-normal">Fecha</th>
                  <th className="px-3 py-2.5 font-normal">Tipo</th>
                  <th className="px-3 py-2.5 font-normal"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sources.map((s) => {
                  const expanded = open.has(s.id);
                  return (
                    <React.Fragment key={s.id}>
                      <tr className="align-top">
                        <td className="max-w-[320px] px-4 py-3">
                          <p className="font-medium">{s.title}</p>
                          <p className="text-muted">{s.publisher ?? "Editorial no determinada"}</p>
                          {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-[11px] text-accent underline-offset-4 hover:underline">{s.url}</a>}
                        </td>
                        <td className="px-3 py-3 font-mono text-[12px] whitespace-nowrap text-muted">{s.publishedAt ? fmtDate(s.publishedAt) : "fecha no determinada"}</td>
                        <td className="px-3 py-3">
                          <Select
                            aria-label={`Tipo de fuente: ${s.title}`}
                            value={s.kind}
                            onChange={(e) => updateSource(s.id, { kind: e.target.value as Source["kind"] })}
                            className="h-8 w-[120px] text-[12px]"
                          >
                            <option value="primary">{SOURCE_KIND_LABEL.primary}</option>
                            <option value="secondary">{SOURCE_KIND_LABEL.secondary}</option>
                          </Select>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {s.excerpt && (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                              className="rounded-sm px-1.5 py-1 text-accent underline-offset-4 hover:underline"
                            >
                              {expanded ? "Ocultar" : "Extracto"}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Quitar fuente ${s.title}`}
                            onClick={() => {
                              setSources((xs) => xs.filter((x) => x.id !== s.id));
                              setClaims((cs) => cs.map((c) => (c.sourceId === s.id ? { ...c, sourceId: null } : c)));
                            }}
                            className="rounded-sm p-1 text-subtle hover:text-danger"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                      {expanded && s.excerpt && (
                        <tr>
                          <td colSpan={4} className="bg-petrol-950/40 px-4 py-3">
                            <pre className="max-h-64 overflow-y-auto font-sans text-[12px] leading-5 whitespace-pre-wrap text-muted">{s.excerpt.slice(0, 6000)}{s.excerpt.length > 6000 ? "…" : ""}</pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        eyebrow={`${counts.verified} verificadas · ${counts.unverified} no verificadas · ${counts.disputed} en disputa`}
        title="Afirmaciones"
        description="Cada dato que aparezca en el guion debería venir de una afirmación verificada con su fuente."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setClaims((cs) => [...cs, { id: newKey("c"), sourceId: null, text: "", status: "unverified", note: null }])}>
            <Icon name="plus" size={14} /> Agregar afirmación
          </Button>
        }
      >
        {claims.length === 0 ? (
          <p className="text-[13px] text-muted">Sin afirmaciones registradas.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {claims.map((c, i) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-lg border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-2 font-mono text-[11px] text-subtle tabular">{String(i + 1).padStart(2, "0")}</span>
                  <Textarea
                    aria-label={`Afirmación ${i + 1}`}
                    value={c.text}
                    onChange={(e) => updateClaim(c.id, { text: e.target.value })}
                    rows={2}
                    maxLength={600}
                    aria-invalid={!c.text.trim() || undefined}
                    className="min-h-16"
                  />
                  <button type="button" aria-label={`Eliminar afirmación ${i + 1}`} onClick={() => setClaims((cs) => cs.filter((x) => x.id !== c.id))} className="mt-1.5 rounded-sm p-1 text-subtle hover:text-danger">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="grid gap-3 pl-8 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.2fr)]">
                  <Select aria-label="Estado" value={c.status} onChange={(e) => updateClaim(c.id, { status: e.target.value as Claim["status"] })} className="h-9 text-[13px]">
                    {Object.entries(CLAIM_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                  <Select aria-label="Fuente vinculada" value={c.sourceId ?? ""} onChange={(e) => updateClaim(c.id, { sourceId: e.target.value || null })} className="h-9 text-[13px]">
                    <option value="">Sin fuente vinculada</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.title.slice(0, 60)}</option>)}
                  </Select>
                  <Input aria-label="Nota" value={c.note ?? ""} maxLength={400} onChange={(e) => updateClaim(c.id, { note: e.target.value || null })} placeholder="Nota (opcional)" className="h-9 text-[13px]" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {error && <InlineError message={error} />}
      <SaveBar dirty={dirty} note={invalid ? "Hay afirmaciones vacías: complétalas o elimínalas." : undefined}>
        <Button variant="ghost" onClick={() => ctx.goTab("script")}>Continuar al guion</Button>
        <Button onClick={save} loading={saving} disabled={!dirty || invalid}>Guardar investigación</Button>
      </SaveBar>
    </div>
  );
}
