"use client";
import * as React from "react";
import { Badge, BrandSwitcher, Button, Card, Field, Icon, Input, SectionHeader, Select, Skeleton, useToast } from "@/components/ui";
import { BRANDS, type BrandId } from "@/shared/brands";
import { TARGET_DURATIONS } from "@/shared/schema";
import { api, errorMessage } from "./api-client";
import { setBrandValue } from "./brand-store";
import { ErrorCard, InlineError, PageContainer, SectionTitle } from "./common";
import { useHealth } from "./health";
import type { SettingsResponse } from "./types";
import { useApi } from "./use-api";

const ENV_VARS: { name: string; note: string; group: string }[] = [
  { group: "IA de texto", name: "ANTHROPIC_API_KEY", note: "Habilita investigación, guion y storyboard con IA." },
  { group: "IA de texto", name: "ANTHROPIC_MODEL", note: "Modelo de Anthropic a usar (opcional)." },
  { group: "Voz y transcripción", name: "ELEVENLABS_API_KEY", note: "Genera narración y tiempos exactos de palabra." },
  { group: "Voz y transcripción", name: "ELEVENLABS_VOICE_ID", note: "Identificador de la voz a usar (obligatorio con la clave)." },
  { group: "Voz y transcripción", name: "ELEVENLABS_MODEL", note: "Modelo de voz (opcional)." },
  { group: "Voz y transcripción", name: "OPENAI_API_KEY", note: "Transcripción con Whisper para alinear tu audio." },
  { group: "Voz y transcripción", name: "OPENAI_TRANSCRIBE_MODEL", note: "Modelo de transcripción, por defecto whisper-1 (opcional)." },
  { group: "Render", name: "RENDER_CONCURRENCY", note: "Hilos de render de Remotion (2 es seguro en equipos modestos)." },
  { group: "Render", name: "RENDER_PREVIEW_SCALE", note: "Escala de la previsualización rápida (0.5 = 540×960)." },
  { group: "Render", name: "RENDER_X264_PRESET", note: "Preset de x264 del render final (medium, slow…)." },
  { group: "Render", name: "REMOTION_BROWSER_EXECUTABLE", note: "Ruta a Chrome/Chromium si Remotion no puede descargar el suyo." },
];

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? <Badge variant="success">Configurado</Badge> : <Badge variant="neutral">No configurado</Badge>;
}

export function SettingsView() {
  const { toast } = useToast();
  const { health, reload: reloadHealth } = useHealth();
  const data = useApi<SettingsResponse>("/api/settings");
  const [form, setForm] = React.useState<{ defaultBrand: BrandId; defaultTargetDuration: string; defaultAudience: string; captionsMaxChars: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const s = data.data;
  // El formulario se siembra una sola vez cuando llegan los ajustes.
  const initial = s
    ? {
        defaultBrand: (s.settings.defaultBrand as BrandId) || "vision-one",
        defaultTargetDuration: s.settings.defaultTargetDuration || "45",
        defaultAudience: s.settings.defaultAudience || "",
        captionsMaxChars: s.settings.captionsMaxChars || "26",
      }
    : null;
  const f = form ?? initial;
  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(initial);
  const capsNum = Number(f?.captionsMaxChars);
  const capsInvalid = !f || !/^\d{2}$/.test(f.captionsMaxChars) || capsNum < 14 || capsNum > 36;

  async function save() {
    if (!f) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/settings", { method: "PUT", body: f });
      setBrandValue(f.defaultBrand);
      setForm(null);
      data.reload();
      toast({ title: "Preferencias guardadas", tone: "success" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const groups = Array.from(new Set(ENV_VARS.map((v) => v.group)));

  return (
    <PageContainer className="max-w-[1080px]">
      <SectionHeader as="h1" eyebrow="Sistema" title="Configuración" description="Estado de los proveedores y preferencias no secretas. Las claves nunca se muestran ni se editan desde la app." />

      {data.error && !s ? (
        <div className="mt-10"><ErrorCard title="No pudimos leer la configuración" message={data.error} onRetry={data.reload} /></div>
      ) : !s || !f ? (
        <Skeleton className="mt-10 h-96" />
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          <section>
            <SectionTitle eyebrow="Proveedores" title="Estado de conexión" />
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-medium">Anthropic</h3><StatusBadge ok={s.providers.anthropic} /></div>
                <p className="text-[13px] text-muted">Investigación, guion y storyboard con IA.</p>
                <p className="font-mono text-[11px] text-subtle">Modelo: {s.providers.anthropicModel}</p>
              </Card>
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-medium">ElevenLabs</h3><StatusBadge ok={s.providers.elevenlabs} /></div>
                <p className="text-[13px] text-muted">Narración con voz sintética de calidad. Requiere clave y voz.</p>
                <p className="font-mono text-[11px] text-subtle">Modelo: {s.providers.elevenlabsModel}</p>
              </Card>
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-medium">OpenAI</h3><StatusBadge ok={s.providers.openai} /></div>
                <p className="text-[13px] text-muted">Transcripción (Whisper) para alinear tus audios.</p>
              </Card>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
              Modo actual: {health ? (health.mode === "ai" ? <Badge variant="accent">IA conectada</Badge> : <Badge variant="gold">Offline / Demo</Badge>) : "…"}
              <button type="button" onClick={reloadHealth} className="text-accent underline-offset-4 hover:underline">Volver a comprobar</button>
            </p>
          </section>

          <section>
            <SectionTitle eyebrow="Claves y ajustes técnicos" title="Variables de .env.local" />
            <Card className="p-6">
              <p className="text-sm text-muted">
                Las claves se leen del archivo <code className="rounded-sm bg-raised px-1.5 py-0.5 font-mono text-[12px] text-fg">{s.envFile}</code> en la raíz del proyecto. Edítalo con tu editor de texto y reinicia el servidor (<code className="font-mono text-[12px] text-fg">npm run dev</code>). Nunca se envían al navegador.
              </p>
              <div className="mt-6 grid gap-8 md:grid-cols-3">
                {groups.map((g) => (
                  <div key={g}>
                    <span className="eyebrow">{g}</span>
                    <ul className="mt-3 flex flex-col gap-3">
                      {ENV_VARS.filter((v) => v.group === g).map((v) => (
                        <li key={v.name}>
                          <code className="font-mono text-[12px] text-accent">{v.name}</code>
                          <p className="text-[12px] text-muted">{v.note}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <pre className="mt-6 overflow-x-auto rounded-md border border-line bg-petrol-950/60 p-4 font-mono text-[12px] leading-5 text-muted">{`# .env.local\nANTHROPIC_API_KEY=…\nELEVENLABS_API_KEY=…\nELEVENLABS_VOICE_ID=…\nRENDER_CONCURRENCY=2`}</pre>
            </Card>
          </section>

          <section>
            <SectionTitle eyebrow="Render y herramientas" title="Entorno local" />
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <span className="eyebrow">Render (Remotion)</span>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[13px]">
                  <dt className="text-muted">Hilos</dt><dd className="font-mono tabular">{s.render.concurrency}</dd>
                  <dt className="text-muted">Escala preview</dt><dd className="font-mono tabular">{s.render.previewScale}</dd>
                  <dt className="text-muted">Preset x264</dt><dd className="font-mono">{s.render.x264Preset}</dd>
                  <dt className="text-muted">Navegador</dt><dd className="font-mono">{s.render.browser === "custom" ? "Personalizado" : "Predeterminado de Remotion"}</dd>
                </dl>
              </Card>
              <Card className="p-5">
                <span className="eyebrow">Herramientas</span>
                <ul className="mt-3 flex flex-col gap-2 text-[13px]">
                  {(
                    [
                      ["ffmpeg", health?.tools.ffmpeg, "Necesario para medir el audio y verificar los renders."],
                      ["ffprobe", health?.tools.ffprobe, "Lectura de metadatos de audio y video."],
                      ["Voz de demostración (espeak-ng)", health?.tools.demoTts, "Voz sintética básica para probar el flujo."],
                    ] as const
                  ).map(([name, ok, note]) => (
                    <li key={name} className="flex items-start gap-2">
                      <Icon name={ok ? "check" : "alert"} size={14} className={ok ? "mt-1 text-success" : "mt-1 text-gold-400"} />
                      <span><span className="font-mono text-[12px]">{name}</span> <span className="text-muted">· {health ? (ok ? "disponible" : "no encontrada") : "comprobando…"}. {note}</span></span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>

          <section>
            <SectionTitle eyebrow="Preferencias" title="Valores por defecto" />
            <Card className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium">Marca predeterminada</span>
                  <BrandSwitcher value={f.defaultBrand} onValueChange={(b) => setForm({ ...f, defaultBrand: b })} className="self-start" />
                  <p className="text-xs text-muted">{BRANDS[f.defaultBrand].tagline}. Al guardar, también se activa como marca actual.</p>
                </div>
                <Field label="Duración objetivo por defecto">
                  {(ids) => (
                    <Select {...ids} value={f.defaultTargetDuration} onChange={(e) => setForm({ ...f, defaultTargetDuration: e.target.value })}>
                      {TARGET_DURATIONS.map((d) => <option key={d} value={String(d)}>{d} segundos</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Audiencia por defecto" className="md:col-span-2">
                  {(ids) => <Input {...ids} value={f.defaultAudience} maxLength={200} onChange={(e) => setForm({ ...f, defaultAudience: e.target.value })} placeholder="Ej. Profesionales de operaciones sin formación técnica" />}
                </Field>
                <Field label="Caracteres por línea de subtítulo" hint="Entre 14 y 36." error={capsInvalid ? "Escribe un número de dos dígitos entre 14 y 36." : undefined}>
                  {(ids) => <Input {...ids} inputMode="numeric" value={f.captionsMaxChars} maxLength={2} onChange={(e) => setForm({ ...f, captionsMaxChars: e.target.value })} className="w-28 font-mono" />}
                </Field>
              </div>
              <InlineError className="mt-4" message={error} />
              <div className="mt-6 flex justify-end">
                <Button loading={saving} disabled={!dirty || capsInvalid} onClick={save}>Guardar preferencias</Button>
              </div>
            </Card>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
