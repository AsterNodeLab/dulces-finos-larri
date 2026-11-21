"use client";
import * as React from "react";
import { Button, Icon, Input, Label, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CAMERA_LABEL } from "@/components/app/labels";

/* ───────── Introspección mínima de esquemas Zod 4 ───────── */

interface ZodLike {
  _zod: {
    def: {
      type: string;
      innerType?: ZodLike;
      element?: ZodLike;
      entries?: Record<string, string>;
      checks?: { _zod: { def: { check: string; minimum?: number; maximum?: number } } }[];
    };
  };
  shape?: Record<string, ZodLike>;
  maxLength?: number | null;
  minLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  isInt?: boolean;
}

export type Desc =
  | { kind: "string"; min?: number; max?: number; optional: boolean }
  | { kind: "number"; int: boolean; min?: number; max?: number; optional: boolean }
  | { kind: "boolean"; optional: boolean }
  | { kind: "enum"; options: string[]; optional: boolean }
  | { kind: "array"; item: Desc; min?: number; max?: number; optional: boolean }
  | { kind: "object"; fields: [string, Desc][]; optional: boolean };

const finite = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 1e12 ? n : undefined);

export function describe(schema: unknown): Desc {
  let s = schema as ZodLike;
  let optional = false;
  while (["optional", "default", "nullable", "readonly"].includes(s._zod.def.type) && s._zod.def.innerType) {
    if (s._zod.def.type === "optional") optional = true;
    s = s._zod.def.innerType;
  }
  const t = s._zod.def.type;
  if (t === "string") return { kind: "string", min: finite(s.minLength), max: finite(s.maxLength), optional };
  if (t === "number") return { kind: "number", int: Boolean(s.isInt), min: finite(s.minValue), max: finite(s.maxValue), optional };
  if (t === "boolean") return { kind: "boolean", optional };
  if (t === "enum") return { kind: "enum", options: Object.values(s._zod.def.entries ?? {}), optional };
  if (t === "array") {
    const checks = s._zod.def.checks ?? [];
    return {
      kind: "array",
      item: describe(s._zod.def.element),
      min: checks.find((c) => c._zod.def.check === "min_length")?._zod.def.minimum,
      max: checks.find((c) => c._zod.def.check === "max_length")?._zod.def.maximum,
      optional,
    };
  }
  if (t === "object") return { kind: "object", fields: Object.entries(s.shape ?? {}).map(([k, v]) => [k, describe(v)]), optional };
  return { kind: "string", optional: true };
}

export function defaultFor(desc: Desc): unknown {
  switch (desc.kind) {
    case "string": return desc.min && desc.min > 0 ? "Nuevo" : "";
    case "number": return desc.min !== undefined && desc.min > 0 ? desc.min : 0;
    case "boolean": return false;
    case "enum": return desc.options[0];
    case "array": return Array.from({ length: desc.min ?? 0 }, () => defaultFor(desc.item));
    case "object": return Object.fromEntries(desc.fields.filter(([, d]) => !d.optional).map(([k, d]) => [k, defaultFor(d)]));
  }
}

/* ───────── Etiquetas ───────── */

const PROP_LABEL: Record<string, string> = {
  kicker: "Antetítulo", headline: "Titular", highlight: "Palabra resaltada", visual: "Fondo animado",
  eyebrow: "Antetítulo", title: "Título", subtitle: "Subtítulo",
  line: "Texto en pantalla", pose: "Pose", side: "Lado", referenceImage: "Imagen de referencia del personaje",
  center: "Concepto central", nodes: "Nodos", label: "Etiqueta", detail: "Detalle", icon: "Ícono", layout: "Disposición",
  columns: "Columnas", name: "Nombre", tag: "Etiqueta", rows: "Filas", values: "Valores", highlightColumn: "Columna destacada (0–2)", sourceNote: "Nota de fuente",
  steps: "Pasos", tool: "Herramienta", loop: "Repetir animación",
  features: "Funciones", description: "Descripción",
  value: "Valor", prefix: "Prefijo", suffix: "Sufijo", decimals: "Decimales", context: "Contexto", source: "Fuente del dato",
  events: "Eventos", date: "Fecha",
  quote: "Cita", author: "Autor", role: "Cargo",
  sources: "Fuentes", publisher: "Publicación", url: "URL", note: "Nota",
  message: "Mensaje", cta: "Llamada a la acción", handle: "Usuario",
};

const OPTION_LABEL: Record<string, string> = {
  "pulse-grid": "Retícula pulsante", orbit: "Órbita", question: "Pregunta",
  idle: "En reposo", "point-left": "Señala a la izquierda", "point-right": "Señala a la derecha", explain: "Explica",
  left: "Izquierda", right: "Derecha", radial: "Radial", stack: "Apilado",
  ...CAMERA_LABEL,
};

export const propLabel = (k: string) => PROP_LABEL[k] ?? k;
export const optionLabel = (o: string) => OPTION_LABEL[o] ?? o;

/* ───────── Controles ───────── */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill border transition-colors duration-150",
        checked ? "border-accent bg-accent/25" : "border-line-strong bg-raised",
      )}
    >
      <span className={cn("absolute size-4 rounded-full transition-all duration-150", checked ? "left-5 bg-accent" : "left-1 bg-muted")} />
    </button>
  );
}

function Row({ label, hint, htmlFor, counter, children, className }: { label: string; hint?: string; htmlFor?: string; counter?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[12px] text-muted">{label}</Label>
        {counter && <span className="font-mono text-[10px] text-subtle tabular">{counter}</span>}
      </div>
      {children}
      {hint && <p className="text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}

export interface FieldEnv {
  /** Opciones del personaje: [{value: filePath, label}] */
  characterAssets: { value: string; label: string }[];
}

export function FieldControl({
  name,
  desc,
  value,
  onChange,
  env,
  label: labelOverride,
}: {
  name: string;
  desc: Desc;
  value: unknown;
  onChange: (v: unknown) => void;
  env: FieldEnv;
  label?: string;
}) {
  const id = React.useId();
  const label = labelOverride ?? propLabel(name);

  if (desc.kind === "string") {
    if (name === "referenceImage") {
      return (
        <Row label={label} htmlFor={id} hint="Sube referencias en Recursos de marca. Sin imagen se usa el avatar geométrico provisional.">
          <Select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">Avatar provisional</option>
            {env.characterAssets.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            {value && !env.characterAssets.some((a) => a.value === value) ? <option value={value as string}>{value as string}</option> : null}
          </Select>
        </Row>
      );
    }
    const str = (value as string | undefined) ?? "";
    const long = (desc.max ?? 0) > 100;
    const counter = desc.max ? `${str.length}/${desc.max}` : undefined;
    const invalid = (desc.max !== undefined && str.length > desc.max) || (!desc.optional && !str.trim());
    const set = (v: string) => onChange(v === "" && desc.optional ? undefined : v);
    return (
      <Row label={label} htmlFor={id} counter={counter}>
        {long ? (
          <Textarea id={id} rows={3} value={str} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} className="min-h-[76px] text-[13px]" />
        ) : (
          <Input id={id} value={str} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} className="h-9 text-[13px]" />
        )}
      </Row>
    );
  }

  if (desc.kind === "number") {
    const n = value as number | undefined;
    return (
      <Row label={label} htmlFor={id} hint={desc.min !== undefined || desc.max !== undefined ? `Rango ${desc.min ?? "−∞"} – ${desc.max ?? "∞"}` : undefined}>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={desc.int ? 1 : "any"}
          min={desc.min}
          max={desc.max}
          value={n ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(desc.optional ? undefined : 0);
            const num = Number(raw);
            if (Number.isFinite(num)) onChange(num);
          }}
          className="h-9 text-[13px]"
        />
      </Row>
    );
  }

  if (desc.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3 py-2">
        <span className="text-[13px]">{label}</span>
        <Toggle checked={Boolean(value)} onChange={onChange} label={label} />
      </div>
    );
  }

  if (desc.kind === "enum") {
    return (
      <Row label={label} htmlFor={id}>
        <Select id={id} value={(value as string | undefined) ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} className="h-9 text-[13px]">
          {desc.optional && <option value="">{name === "icon" ? "Sin ícono" : "—"}</option>}
          {desc.options.map((o) => <option key={o} value={o}>{name === "icon" ? o : optionLabel(o)}</option>)}
        </Select>
      </Row>
    );
  }

  if (desc.kind === "array") {
    const items = (Array.isArray(value) ? value : []) as unknown[];
    const canAdd = desc.max === undefined || items.length < desc.max;
    const canRemove = desc.min === undefined || items.length > desc.min;
    const primitive = desc.item.kind !== "object";
    return (
      <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
        <legend className="px-1 text-[12px] text-muted">
          {label} <span className="font-mono text-[10px] text-subtle">{items.length}{desc.max ? `/${desc.max}` : ""}{desc.min ? ` · mín. ${desc.min}` : ""}</span>
        </legend>
        {items.map((it, i) => (
          <div key={i} className={cn("flex items-start gap-2", !primitive && "rounded-md bg-petrol-950/30 p-2.5")}>
            <span className="mt-2 w-4 shrink-0 text-center font-mono text-[10px] text-subtle">{i + 1}</span>
            <div className="min-w-0 flex-1">
              {desc.item.kind === "object" ? (
                <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
                  {desc.item.fields.map(([k, d]) => (
                    <div key={k} className={d.kind === "array" ? "@md:col-span-2" : undefined}>
                      <FieldControl
                        name={k}
                        desc={d}
                        value={(it as Record<string, unknown>)[k]}
                        env={env}
                        onChange={(v) => onChange(items.map((x, xi) => (xi === i ? cleanObject({ ...(x as Record<string, unknown>), [k]: v }) : x)))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <FieldControl name={name} label={`${label} ${i + 1}`} desc={desc.item} value={it} env={env} onChange={(v) => onChange(items.map((x, xi) => (xi === i ? v : x)))} />
              )}
            </div>
            <button
              type="button"
              aria-label={`Quitar ${label} ${i + 1}`}
              disabled={!canRemove}
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="mt-1.5 rounded-sm p-1 text-subtle hover:text-danger disabled:opacity-30 disabled:hover:text-subtle"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
        <div>
          <Button variant="outline" size="sm" disabled={!canAdd} onClick={() => onChange([...items, defaultFor(desc.item)])}>
            <Icon name="plus" size={14} /> Agregar
          </Button>
        </div>
      </fieldset>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {desc.fields.map(([k, d]) => (
        <FieldControl key={k} name={k} desc={d} value={(value as Record<string, unknown> | undefined)?.[k]} env={env} onChange={(v) => onChange(cleanObject({ ...(value as Record<string, unknown>), [k]: v }))} />
      ))}
    </div>
  );
}

/** Elimina claves undefined para no ensuciar el JSON del spec. */
export function cleanObject<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
}
