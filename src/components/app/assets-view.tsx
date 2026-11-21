"use client";
import * as React from "react";
import { Badge, Button, Dialog, EmptyState, Field, Icon, Input, SectionHeader, Skeleton, Textarea, useToast } from "@/components/ui";
import { BRANDS } from "@/shared/brands";
import type { Asset } from "@/shared/schema";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "./api-client";
import { useBrand } from "./brand-store";
import { ErrorCard, InlineError, PageContainer, SectionTitle } from "./common";
import { fmtDate, mediaUrl } from "./format";
import { ASSET_KIND_LABEL } from "./labels";
import { useApi } from "./use-api";
import { ConfirmDialog } from "@/components/editor/ui-bits";

type Kind = Asset["kind"];

function ImageThumb({ asset, ratio = "aspect-[3/4]" }: { asset: Asset; ratio?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-petrol-950", ratio)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(asset.filePath)} alt={asset.label} className="size-full object-contain" loading="lazy" />
    </div>
  );
}

export function AssetsView() {
  const { toast } = useToast();
  const { brand } = useBrand();
  const assets = useApi<{ assets: Asset[] }>(`/api/assets?brand=${brand}`);
  const [upload, setUpload] = React.useState<Kind | null>(null);
  const [toDelete, setToDelete] = React.useState<Asset | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const list = assets.data?.assets ?? [];
  const of = (k: Kind) => list.filter((a) => a.kind === k);

  async function doDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/assets/${toDelete.id}`, { method: "DELETE" });
      toast({ title: "Recurso eliminado", tone: "success" });
      setToDelete(null);
      assets.reload();
    } catch (e) {
      toast({ title: "No se pudo eliminar", description: errorMessage(e), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const characterKinds: Kind[] = ["character-front", "character-side", "character-hands"];
  const hasCharacter = characterKinds.some((k) => of(k).length > 0);

  return (
    <PageContainer>
      <SectionHeader as="h1" eyebrow={`Recursos · ${BRANDS[brand].name}`} title="Recursos de marca" description="Referencias del personaje, logotipos, imágenes y música de la marca activa. Cambia de marca arriba para ver la otra biblioteca." />

      {assets.error && !assets.data ? (
        <div className="mt-10"><ErrorCard title="No pudimos leer los recursos" message={assets.error} onRetry={assets.reload} /></div>
      ) : !assets.data ? (
        <Skeleton className="mt-10 h-72" />
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          <section>
            <SectionTitle eyebrow="Presentador" title="Personaje" />
            <div className="mb-6 rounded-lg border border-line bg-raised/30 px-5 py-4 text-[13px] leading-5 text-muted">
              <p>
                Mientras no subas una referencia del personaje, los videos usan un <span className="text-fg">avatar geométrico provisional</span>. Cuando subas imágenes de frente, perfil y manos, podrás elegirlas en la escena “Presentador” del storyboard.
                {hasCharacter ? " Ya hay referencias cargadas para esta marca." : ""}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {characterKinds.map((k) => (
                <div key={k} className="flex flex-col gap-3">
                  <span className="eyebrow">{ASSET_KIND_LABEL[k]}</span>
                  <div className="grid grid-cols-2 gap-3">
                    {of(k).map((a) => (
                      <AssetCard key={a.id} asset={a} onDelete={() => setToDelete(a)} />
                    ))}
                    <UploadTile label="Subir" onClick={() => setUpload(k)} ratio="aspect-[3/4]" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle eyebrow="Identidad" title="Logotipos" actions={<Button variant="secondary" size="sm" onClick={() => setUpload("logo")}><Icon name="upload" size={14} /> Subir logotipo</Button>} />
            {of("logo").length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-6 py-8 text-sm text-muted">Sin logotipos para {BRANDS[brand].name}. PNG, JPG o WEBP (no se aceptan SVG).</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {of("logo").map((a) => <li key={a.id}><AssetCard asset={a} ratio="aspect-video" onDelete={() => setToDelete(a)} /></li>)}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle eyebrow="Material visual" title="Imágenes" actions={<Button variant="secondary" size="sm" onClick={() => setUpload("image")}><Icon name="upload" size={14} /> Subir imagen</Button>} />
            {of("image").length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-6 py-8 text-sm text-muted">Sin imágenes todavía.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {of("image").map((a) => <li key={a.id}><AssetCard asset={a} ratio="aspect-square" onDelete={() => setToDelete(a)} /></li>)}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle eyebrow="Audio" title="Música" actions={<Button variant="secondary" size="sm" onClick={() => setUpload("music")}><Icon name="upload" size={14} /> Subir pista</Button>} />
            <p className="mb-4 text-[13px] text-muted">Usa solo pistas con licencia verificada; registra la fuente. La nota de licencia es obligatoria.</p>
            {of("music").length === 0 ? (
              <EmptyState icon={<Icon name="mic" size={20} />} title="Sin música" description="Sube una pista MP3, WAV o M4A con su licencia para usarla como fondo en el storyboard." className="py-10" />
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {of("music").map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium">{a.label}</p>
                      <p className="text-[12px] text-muted">Licencia: {a.licenseNote}</p>
                    </div>
                    <audio controls preload="none" src={mediaUrl(a.filePath)} className="h-9 w-64" />
                    <Badge variant="success">Con licencia</Badge>
                    <button type="button" aria-label={`Eliminar ${a.label}`} onClick={() => setToDelete(a)} className="rounded-sm p-1 text-subtle hover:text-danger"><Icon name="trash" size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <UploadDialog kind={upload} brand={brand} onClose={() => setUpload(null)} onDone={() => { setUpload(null); assets.reload(); }} />
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Eliminar recurso"
        description={toDelete ? `Se eliminará “${toDelete.label}”. Los storyboards que lo usen volverán al avatar provisional o se quedarán sin él.` : ""}
        confirmLabel="Eliminar"
        tone="danger"
      />
    </PageContainer>
  );
}

function AssetCard({ asset, ratio, onDelete }: { asset: Asset; ratio?: string; onDelete: () => void }) {
  return (
    <figure className="group relative flex flex-col gap-2">
      <ImageThumb asset={asset} ratio={ratio} />
      <figcaption className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[12px]">{asset.label}</span>
          <span className="font-mono text-[10px] text-subtle">{fmtDate(asset.createdAt)}</span>
        </span>
        <button type="button" aria-label={`Eliminar ${asset.label}`} onClick={onDelete} className="rounded-sm p-1 text-subtle hover:text-danger"><Icon name="trash" size={14} /></button>
      </figcaption>
    </figure>
  );
}

function UploadTile({ label, onClick, ratio }: { label: string; onClick: () => void; ratio: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-[12px] text-muted transition-colors hover:border-accent hover:text-accent", ratio)}>
      <Icon name="upload" size={18} />
      {label}
    </button>
  );
}

function UploadDialog({ kind, brand, onClose, onDone }: { kind: Kind | null; brand: "vision-one" | "visionquant"; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [label, setLabel] = React.useState("");
  const [license, setLicense] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const music = kind === "music";

  function close() {
    setFile(null);
    setLabel("");
    setLicense("");
    setError(null);
    onClose();
  }

  async function submit() {
    if (!kind || !file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("brand", brand);
      form.append("kind", kind);
      form.append("label", label.trim() || file.name);
      if (license.trim()) form.append("licenseNote", license.trim());
      await api("/api/assets", { method: "POST", form });
      toast({ title: "Recurso subido", tone: "success" });
      setFile(null);
      setLabel("");
      setLicense("");
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={kind !== null}
      onClose={close}
      title={kind ? `Subir · ${ASSET_KIND_LABEL[kind]}` : "Subir recurso"}
      description={`Para ${BRANDS[brand].name}. ${music ? "MP3, WAV o M4A." : "PNG, JPG o WEBP."}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancelar</Button>
          <Button loading={busy} disabled={!file || (music && !license.trim())} onClick={submit}>Subir</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Archivo" required>
          {(ids) => (
            <Input
              {...ids}
              type="file"
              accept={music ? ".mp3,.wav,.m4a" : ".png,.jpg,.jpeg,.webp"}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !label) setLabel(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="h-auto py-2"
            />
          )}
        </Field>
        <Field label="Nombre">
          {(ids) => <Input {...ids} value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        {music && (
          <Field label="Licencia u origen" required hint="Ej. “Pista propia”, “Licencia comercial de …”, URL de la licencia.">
            {(ids) => <Textarea {...ids} rows={2} value={license} maxLength={300} onChange={(e) => setLicense(e.target.value)} />}
          </Field>
        )}
        <InlineError message={error} />
      </div>
    </Dialog>
  );
}
