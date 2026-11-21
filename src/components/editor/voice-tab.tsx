"use client";
import * as React from "react";
import { Button, EmptyState, Icon, Input, useToast } from "@/components/ui";
import type { Narration, WordTiming } from "@/shared/schema";
import { api, errorMessage } from "@/components/app/api-client";
import { InlineError } from "@/components/app/common";
import { fmtClock, fmtDateTime, mediaUrl } from "@/components/app/format";
import { useHealth } from "@/components/app/health";
import { cn } from "@/lib/utils";
import { Callout, ConfirmDialog, Panel, SaveBar } from "./ui-bits";
import type { TabCtx } from "./types";

const KIND_LABEL: Record<Narration["kind"], string> = {
  upload: "Archivo subido",
  elevenlabs: "ElevenLabs",
  "demo-tts": "Voz sintética de demostración",
};
const ALIGN_LABEL: Record<Narration["alignmentSource"], string> = {
  elevenlabs: "Exacta (ElevenLabs)",
  whisper: "Transcripción (Whisper)",
  estimated: "Estimada",
};

export function VoiceTab({ ctx }: { ctx: TabCtx }) {
  const { toast } = useToast();
  const { health } = useHealth();
  const { id, bundle } = ctx;
  const n = bundle.narration;
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState<null | "upload" | "elevenlabs" | "demo-tts" | "realign" | "delete">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function run(kind: NonNullable<typeof busy>, fn: () => Promise<Narration | null>, okTitle: string) {
    setBusy(kind);
    setError(null);
    try {
      const nar = await fn();
      ctx.patch({ narration: nar });
      ctx.reload();
      ctx.refreshPreview();
      toast({ title: okTitle, tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const upload = (file: File) =>
    run(
      "upload",
      async () => {
        const form = new FormData();
        form.append("file", file);
        return (await api<{ narration: Narration }>(`/api/projects/${id}/narration`, { method: "POST", form })).narration;
      },
      "Narración cargada",
    );
  const generate = (provider: "elevenlabs" | "demo-tts") =>
    run(provider, async () => (await api<{ narration: Narration }>(`/api/projects/${id}/narration/generate`, { method: "POST", body: { provider } })).narration, "Narración generada");
  const realign = () => run("realign", async () => (await api<{ narration: Narration }>(`/api/projects/${id}/narration/realign`, { method: "POST" })).narration, "Subtítulos re-alineados");
  const remove = () => {
    setConfirmDelete(false);
    return run("delete", async () => { await api(`/api/projects/${id}/narration`, { method: "DELETE" }); return null; }, "Narración eliminada");
  };

  return (
    <div className="flex flex-col gap-8">
      <Panel
        eyebrow="Paso 4"
        title="Narración"
        description="Sube tu propia voz o genera una. La narración define la duración de las escenas y los subtítulos."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
            className="sr-only"
            aria-label="Archivo de audio"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <Button variant={n ? "secondary" : "primary"} loading={busy === "upload"} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Subir MP3 / WAV / M4A
          </Button>
          {health?.providers.elevenlabs && (
            <Button variant="secondary" loading={busy === "elevenlabs"} onClick={() => generate("elevenlabs")}>
              <Icon name="mic" size={16} /> Generar con ElevenLabs
            </Button>
          )}
          {health?.tools.demoTts && (
            <Button variant="outline" loading={busy === "demo-tts"} onClick={() => generate("demo-tts")}>
              <Icon name="mic" size={16} /> Voz sintética de demostración
            </Button>
          )}
        </div>
        <ul className="mt-4 flex flex-col gap-1 text-[12px] text-subtle">
          {health && !health.providers.elevenlabs && <li>ElevenLabs no está configurado: agrega ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID en .env.local para generar voz.</li>}
          {health?.tools.demoTts && <li>La voz sintética de demostración sirve para probar el flujo; no es una voz final.</li>}
        </ul>
        {error && <InlineError className="mt-4" message={error} />}
      </Panel>

      {!n ? (
        <EmptyState
          icon={<Icon name="mic" size={20} />}
          title="Sin narración todavía"
          description="Sin audio el video se renderiza sin voz y con duraciones fijas del storyboard. Sube una pista o genera una para sincronizar escenas y subtítulos."
        />
      ) : (
        <>
          <Panel
            eyebrow="Narración activa"
            title={KIND_LABEL[n.kind]}
            actions={
              <>
                <Button variant="outline" size="sm" loading={busy === "realign"} onClick={realign}><Icon name="refresh" size={14} /> Re-alinear</Button>
                <Button variant="ghost" size="sm" loading={busy === "delete"} onClick={() => setConfirmDelete(true)}><Icon name="trash" size={14} /> Eliminar</Button>
              </>
            }
          >
            <audio controls preload="metadata" src={mediaUrl(n.filePath)} className="w-full" />
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] md:grid-cols-4">
              <Meta label="Origen" value={KIND_LABEL[n.kind]} />
              <Meta label="Duración" value={`${fmtClock(n.durationInSeconds)} (${n.durationInSeconds.toFixed(1)} s)`} mono />
              <Meta label="Sincronía de palabras" value={ALIGN_LABEL[n.alignmentSource]} />
              <Meta label="Cargada" value={fmtDateTime(n.createdAt)} mono />
            </dl>
            {n.kind === "demo-tts" && <Callout tone="gold" title="Voz de demostración" className="mt-5">Es una voz sintética básica para probar el flujo. Reemplázala por tu narración antes de publicar.</Callout>}
            {n.alignmentSource === "estimated" && (
              <Callout tone="gold" title="Tiempos estimados" className="mt-3">
                “Estimada” significa que el momento en que aparece cada palabra se calculó de forma aproximada (sin transcribir el audio). Revisa los subtítulos abajo y corrige los tiempos donde no coincidan con la voz.
              </Callout>
            )}
          </Panel>
          <SubtitleEditor key={`${n.id}-${n.alignmentSource}-${n.createdAt}`} ctx={ctx} narration={n} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Eliminar narración"
        description="Se borra la narración activa y sus subtítulos. El storyboard vuelve a sus duraciones propias."
        confirmLabel="Eliminar"
        tone="danger"
      />
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className={cn(mono && "font-mono text-[12px] tabular")}>{value}</dd>
    </div>
  );
}

/* ───────── Subtítulos ───────── */

function groupLines(words: WordTiming[], maxChars: number): number[][] {
  const lines: number[][] = [];
  let cur: number[] = [];
  let len = 0;
  words.forEach((w, i) => {
    const next = cur.length ? len + 1 + w.text.length : w.text.length;
    if (cur.length && next > maxChars) {
      lines.push(cur);
      cur = [i];
      len = w.text.length;
    } else {
      cur.push(i);
      len = next;
    }
  });
  if (cur.length) lines.push(cur);
  return lines;
}

function SubtitleEditor({ ctx, narration }: { ctx: TabCtx; narration: Narration }) {
  const { toast } = useToast();
  const [words, setWords] = React.useState<WordTiming[]>(narration.words);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const maxChars = ctx.bundle.storyboard?.spec.captions.maxCharsPerLine ?? 26;
  const lines = React.useMemo(() => groupLines(words, maxChars), [words, maxChars]);
  const dirty = JSON.stringify(words) !== JSON.stringify(narration.words);
  const bad = (w: WordTiming) => !w.text.trim() || w.start < 0 || w.end < w.start;
  const invalid = words.some(bad);

  const set = (i: number, p: Partial<WordTiming>) => setWords((ws) => ws.map((w, k) => (k === i ? { ...w, ...p } : w)));
  const num = (v: string) => (Number.isFinite(Number(v)) && v !== "" ? Math.max(0, Math.round(Number(v) * 100) / 100) : 0);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await api<{ narration: Narration }>(`/api/projects/${ctx.id}/narration`, {
        method: "PUT",
        body: { words: words.map((w) => ({ text: w.text.trim(), start: w.start, end: w.end })) },
      });
      ctx.patch({ narration: r.narration });
      ctx.reload();
      ctx.refreshPreview();
      toast({ title: "Subtítulos guardados", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel
        eyebrow={`${words.length} palabras · ${lines.length} líneas`}
        title="Subtítulos"
        description={`Texto y tiempos (segundos) de cada palabra, agrupados en líneas de hasta ${maxChars} caracteres. Edita lo que no coincida con la voz.`}
        actions={
          <a
            href={`/api/projects/${ctx.id}/captions.srt`}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong px-3 text-[13px] hover:border-accent hover:text-accent"
          >
            <Icon name="download" size={14} /> Descargar SRT
          </a>
        }
      >
        {words.length === 0 ? (
          <p className="text-[13px] text-muted">No hay palabras con tiempos para esta narración. Prueba “Re-alinear”.</p>
        ) : (
          <ol className="flex max-h-[560px] flex-col gap-3 overflow-y-auto pr-2">
            {lines.map((idxs, li) => (
              <li key={li} className="flex gap-3">
                <span className="w-14 shrink-0 pt-2 font-mono text-[10px] text-subtle tabular">{String(li + 1).padStart(2, "0")} · {words[idxs[0]].start.toFixed(1)}s</span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2 rounded-md border border-line bg-petrol-950/30 p-2">
                  {idxs.map((i) => {
                    const w = words[i];
                    const wb = bad(w);
                    return (
                      <div key={i} className="flex w-[96px] flex-col gap-1">
                        <Input aria-label={`Palabra ${i + 1}`} value={w.text} maxLength={60} aria-invalid={wb || undefined} onChange={(e) => set(i, { text: e.target.value })} className="h-8 px-2 text-[13px]" />
                        <div className="flex gap-1">
                          <Input aria-label={`Inicio de palabra ${i + 1}`} type="number" step={0.01} min={0} value={w.start} aria-invalid={wb || undefined} onChange={(e) => set(i, { start: num(e.target.value) })} className="h-7 px-1.5 font-mono text-[11px]" />
                          <Input aria-label={`Fin de palabra ${i + 1}`} type="number" step={0.01} min={0} value={w.end} aria-invalid={wb || undefined} onChange={(e) => set(i, { end: num(e.target.value) })} className="h-7 px-1.5 font-mono text-[11px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      {error && <InlineError message={error} />}
      <SaveBar dirty={dirty} note={invalid ? "Hay palabras vacías o con el fin antes del inicio." : undefined}>
        <Button variant="ghost" onClick={() => ctx.goTab("render")}>Continuar al render</Button>
        <Button onClick={save} loading={saving} disabled={!dirty || invalid}>Guardar subtítulos</Button>
      </SaveBar>
    </div>
  );
}


