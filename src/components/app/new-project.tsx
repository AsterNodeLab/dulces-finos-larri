"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, BrandSwitcher, Button, Card, Field, Icon, Input, Label, SectionHeader, Textarea, useToast } from "@/components/ui";
import { BRANDS, type BrandId } from "@/shared/brands";
import { TEMPLATES } from "@/shared/templates";
import { TEMPLATE_IDS, type Project } from "@/shared/schema";
import type { TemplateId } from "@/shared/brands";
import { cn } from "@/lib/utils";
import { api, ApiError, errorMessage } from "./api-client";
import { useBrand } from "./brand-store";
import { PageContainer, InlineError } from "./common";
import { SCENE_LABEL } from "./labels";

const IDEA_PLACEHOLDER: Record<BrandId, string> = {
  "vision-one": "Ejemplo: Quiero explicar qué es MCP (Model Context Protocol) y cómo conecta un asistente de IA con las herramientas de una empresa, con un caso práctico para alguien que trabaja en operaciones.",
  visionquant: "Ejemplo: Cómo cambia la política de tasas de la Reserva Federal el costo del crédito para empresas tecnológicas, con escenarios y la fuente primaria de cada dato.",
};

export function NewProject({ initialTemplate }: { initialTemplate?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { brand: globalBrand } = useBrand();
  const [brandOverride, setBrandOverride] = React.useState<BrandId | null>(null);
  const brand = brandOverride ?? globalBrand;
  const allowed = BRANDS[brand].templates;
  const requested = TEMPLATE_IDS.includes(initialTemplate as TemplateId) ? (initialTemplate as TemplateId) : null;
  const [templateChoice, setTemplateChoice] = React.useState<TemplateId | null>(requested);
  const template = templateChoice && allowed.includes(templateChoice) ? templateChoice : allowed[0];
  const [title, setTitle] = React.useState("");
  const [idea, setIdea] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Escribe un título para el proyecto.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setFormError(null);
    try {
      const r = await api<{ project: Project }>("/api/projects", { method: "POST", body: { title: title.trim(), brand, template, idea: idea.trim() } });
      toast({ title: "Proyecto creado", tone: "success" });
      router.push(`/projects/${r.project.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <PageContainer className="max-w-[920px]">
      <SectionHeader as="h1" eyebrow="Nuevo proyecto" title="Crear video" description="Una idea, una marca y una plantilla. El resto del flujo (investigación, guion, storyboard, voz y render) se trabaja dentro del proyecto." />
      <form onSubmit={submit} className="mt-10 flex flex-col gap-8" noValidate>
        <Field label="Título del proyecto" required error={errors.title}>
          {(ids) => <Input {...ids} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Ej. Qué es MCP y por qué importa" autoFocus />}
        </Field>

        <div className="flex flex-col gap-2">
          <Label id="brand-label">Marca</Label>
          <div className="flex flex-wrap items-center gap-4">
            <BrandSwitcher value={brand} onValueChange={(b) => setBrandOverride(b)} />
            <p className="text-[13px] text-muted">{BRANDS[brand].tagline}. Las marcas no se mezclan: el proyecto pertenece a una sola.</p>
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[13px] font-medium">Plantilla</legend>
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Plantilla">
            {allowed.map((id) => {
              const t = TEMPLATES[id];
              const checked = id === template;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setTemplateChoice(id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors duration-150",
                    checked ? "border-accent bg-raised/60" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-serif text-lg font-medium">{t.name}</span>
                    {checked && <Icon name="check" size={16} className="text-accent" />}
                  </span>
                  <span className="text-[13px] text-muted">{t.description}</span>
                  <span className="mt-1 font-mono text-[10px] leading-4 tracking-[0.06em] text-subtle uppercase">
                    {Array.from(new Set(Object.values(t.roleToScene))).slice(0, 4).map((s) => SCENE_LABEL[s]).join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>
          {allowed.length < TEMPLATE_IDS.length && (
            <p className="text-xs text-subtle">
              <Badge variant="neutral">Nota</Badge> <span className="ml-1">{BRANDS[brand].name} habilita {allowed.length} de {TEMPLATE_IDS.length} plantillas.</span>
            </p>
          )}
        </fieldset>

        <Field label="Idea" hint="Opcional. Una o varias frases: qué quieres explicar y para quién. Podrás afinarla con la investigación." error={errors.idea}>
          {(ids) => <Textarea {...ids} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={4000} rows={6} placeholder={IDEA_PLACEHOLDER[brand]} />}
        </Field>

        <InlineError message={formError} />

        <Card className="flex items-center justify-between gap-4 p-5">
          <p className="text-[13px] text-muted">El proyecto se crea con estado “Idea”. Puedes cambiarlo todo después.</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear proyecto</Button>
          </div>
        </Card>
      </form>
    </PageContainer>
  );
}
