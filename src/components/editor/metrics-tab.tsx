"use client";
import * as React from "react";
import { Button, EmptyState, Field, Icon, Input, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import { PLATFORMS, type MetricEntry } from "@/shared/schema";
import { api, errorMessage } from "@/components/app/api-client";
import { InlineError } from "@/components/app/common";
import { fmtDate } from "@/components/app/format";
import { PLATFORM_LABEL } from "@/components/app/labels";
import { useApi } from "@/components/app/use-api";
import { Callout, Panel } from "./ui-bits";
import type { TabCtx } from "./types";

const FIELDS = ["views", "likes", "comments", "shares", "saves"] as const;
const FIELD_LABEL: Record<(typeof FIELDS)[number], string> = { views: "Vistas", likes: "Me gusta", comments: "Comentarios", shares: "Compartidos", saves: "Guardados" };
const CSV_EXAMPLE = "platform,url,views,likes,comments,shares,saves,recorded_at\ntiktok,https://www.tiktok.com/@visionone/video/123,1520,98,7,12,31,2025-03-14";
const nf = new Intl.NumberFormat("es-MX");

export function MetricsTab({ ctx }: { ctx: TabCtx }) {
  const { toast } = useToast();
  const metrics = useApi<{ metrics: MetricEntry[] }>(`/api/projects/${ctx.id}/metrics`);
  const [platform, setPlatform] = React.useState<(typeof PLATFORMS)[number]>("tiktok");
  const [url, setUrl] = React.useState("");
  const [nums, setNums] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [csv, setCsv] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState<{ added: number; errors: unknown[] } | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const usage = ctx.bundle.usage;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { platform, url: url.trim() || null };
      for (const f of FIELDS) body[f] = nums[f] !== undefined && nums[f] !== "" ? Math.max(0, Math.round(Number(nums[f]))) : null;
      await api(`/api/projects/${ctx.id}/metrics`, { method: "POST", body });
      setUrl("");
      setNums({});
      metrics.reload();
      toast({ title: "Métricas registradas", tone: "success" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function importCsv() {
    setImporting(true);
    setImportError(null);
    setImportMsg(null);
    try {
      const r = await api<{ added: number; errors: unknown[] }>(`/api/projects/${ctx.id}/metrics/import`, { method: "POST", body: { csv } });
      setImportMsg(r);
      if (r.added) setCsv("");
      metrics.reload();
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/metrics/${id}`, { method: "DELETE" });
      metrics.reload();
    } catch (err) {
      toast({ title: "No se pudo eliminar", description: errorMessage(err), tone: "error" });
    }
  }

  const rows = metrics.data?.metrics ?? [];

  return (
    <div className="flex flex-col gap-8">
      <Panel eyebrow="Después de publicar" title="Registrar métricas" description="Solo métricas reales registradas por ti. No hay conexión con TikTok, Instagram ni YouTube: copia las cifras desde cada plataforma.">
        <form onSubmit={add} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <Field label="Plataforma">
              {(ids) => (
                <Select {...ids} value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
                </Select>
              )}
            </Field>
            <Field label="URL de la publicación (opcional)">
              {(ids) => <Input {...ids} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {FIELDS.map((f) => (
              <Field key={f} label={FIELD_LABEL[f]}>
                {(ids) => <Input {...ids} type="number" min={0} step={1} inputMode="numeric" value={nums[f] ?? ""} onChange={(e) => setNums((n) => ({ ...n, [f]: e.target.value }))} className="font-mono" />}
              </Field>
            ))}
          </div>
          <InlineError message={error} />
          <div><Button type="submit" loading={saving}><Icon name="plus" size={16} /> Registrar</Button></div>
        </form>
      </Panel>

      <Panel eyebrow={`${rows.length} registro(s)`} title="Métricas registradas">
        {metrics.loading && !metrics.data ? (
          <Skeleton className="h-24" />
        ) : metrics.error ? (
          <InlineError message={metrics.error} />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin métricas todavía" description="Cuando publiques el video, registra aquí sus cifras reales para compararlas entre proyectos." className="py-10" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-line bg-raised/40 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-normal">Plataforma</th>
                  <th className="px-3 py-2.5 font-normal">Fecha</th>
                  {FIELDS.map((f) => <th key={f} className="px-3 py-2.5 text-right font-normal">{FIELD_LABEL[f]}</th>)}
                  <th className="px-3 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">
                      {m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">{PLATFORM_LABEL[m.platform]}</a> : PLATFORM_LABEL[m.platform]}
                      <span className="ml-2 font-mono text-[10px] text-subtle uppercase">{m.origin}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{fmtDate(m.recordedAt)}</td>
                    {FIELDS.map((f) => <td key={f} className="px-3 py-2.5 text-right font-mono tabular">{m[f] === null ? "—" : nf.format(m[f] as number)}</td>)}
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" aria-label="Eliminar registro" onClick={() => remove(m.id)} className="rounded-sm p-1 text-subtle hover:text-danger"><Icon name="trash" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel eyebrow="Alternativa" title="Importar CSV" description="Pega filas exportadas de una hoja de cálculo. Se aceptan los encabezados del ejemplo.">
        <Field label="CSV">
          {(ids) => <Textarea {...ids} value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} className="font-mono text-[12px]" placeholder={CSV_EXAMPLE} />}
        </Field>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" loading={importing} disabled={!csv.trim()} onClick={importCsv}><Icon name="upload" size={14} /> Importar</Button>
          {importMsg && <span className="text-[13px] text-muted">{importMsg.added} fila(s) importada(s){importMsg.errors.length ? `, ${importMsg.errors.length} con error` : ""}.</span>}
        </div>
        {importError && <InlineError className="mt-4" message={importError} />}
        {importMsg && importMsg.errors.length > 0 && (
          <Callout tone="gold" title="Filas con problemas" className="mt-4">
            <ul className="mt-1 flex flex-col gap-1 font-mono text-[12px]">{importMsg.errors.slice(0, 8).map((er, i) => <li key={i}>{typeof er === "string" ? er : JSON.stringify(er)}</li>)}</ul>
          </Callout>
        )}
      </Panel>

      <Panel eyebrow="Costo" title="Uso de IA en este proyecto" description="Llamadas registradas a proveedores de IA y su costo estimado. Es una estimación, no una factura.">
        {usage.calls.length === 0 ? (
          <p className="text-[13px] text-muted">Este proyecto no ha hecho llamadas a proveedores de IA.</p>
        ) : (
          <>
            <p className="mb-4 font-serif text-3xl tabular">
              ${usage.estTotalUsd.toFixed(4)} <span className="font-sans text-[13px] text-muted">USD estimados · {usage.calls.length} llamada(s)</span>
            </p>
            {usage.hasUnpricedCalls && <p className="mb-4 text-[12px] text-gold-400">Algunas llamadas no tienen precio conocido; el total puede estar incompleto.</p>}
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left text-[12px]">
                <thead className="border-b border-line bg-raised/40 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                  <tr><th className="px-4 py-2 font-normal">Operación</th><th className="px-3 py-2 font-normal">Modelo</th><th className="px-3 py-2 text-right font-normal">Entrada/Salida</th><th className="px-3 py-2 text-right font-normal">Costo</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {usage.calls.slice(0, 20).map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{c.operation}<span className="ml-2 font-mono text-[10px] text-subtle">{fmtDate(c.createdAt)}</span></td>
                      <td className="px-3 py-2 font-mono text-muted">{c.provider} · {c.model}</td>
                      <td className="px-3 py-2 text-right font-mono tabular">{c.characters ? `${nf.format(c.characters)} car.` : `${nf.format(c.inputTokens)} / ${nf.format(c.outputTokens)}`}</td>
                      <td className="px-3 py-2 text-right font-mono tabular">{c.estCostUsd === null ? "s/d" : `$${c.estCostUsd.toFixed(4)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
