"use client";
import { useCallback, useSyncExternalStore } from "react";
import { BRAND_IDS, type BrandId } from "@/shared/brands";

/**
 * Marca activa global. Persiste en localStorage, aplica `data-brand` en <html> y se usa
 * como filtro por defecto y como marca de los proyectos nuevos.
 * useSyncExternalStore evita desajustes de hidratación: en el servidor siempre es Vision One.
 */
const BRAND_KEY = "vq.brand";
const BOTH_KEY = "vq.showBoth";
const DEFAULT_BRAND: BrandId = "vision-one";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: la sesión sigue funcionando en memoria */
  }
}

let memBrand: BrandId | null = null;
let memBoth: boolean | null = null;

function readBrand(): BrandId {
  if (memBrand) return memBrand;
  const v = safeGet(BRAND_KEY);
  return (BRAND_IDS as readonly string[]).includes(v ?? "") ? (v as BrandId) : DEFAULT_BRAND;
}
function readBoth(): boolean {
  if (memBoth !== null) return memBoth;
  return safeGet(BOTH_KEY) === "1";
}

export function applyBrandAttribute(brand: BrandId) {
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-brand", brand);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === BRAND_KEY) memBrand = null;
    if (e.key === BOTH_KEY) memBoth = null;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function hasStoredBrand(): boolean {
  return safeGet(BRAND_KEY) !== null;
}

export function setBrandValue(brand: BrandId) {
  memBrand = brand;
  safeSet(BRAND_KEY, brand);
  applyBrandAttribute(brand);
  emit();
}

export function useBrand() {
  const brand = useSyncExternalStore(subscribe, readBrand, () => DEFAULT_BRAND);
  const showBoth = useSyncExternalStore(subscribe, readBoth, () => false);
  const setBrand = useCallback((b: BrandId) => setBrandValue(b), []);
  const setShowBoth = useCallback((v: boolean) => {
    memBoth = v;
    safeSet(BOTH_KEY, v ? "1" : "0");
    emit();
  }, []);
  return { brand, setBrand, showBoth, setShowBoth };
}

/** Script inline (antes del primer pintado) que evita el parpadeo de marca. */
export const BRAND_BOOT_SCRIPT = `try{var b=localStorage.getItem("${BRAND_KEY}");if(b==="visionquant"||b==="vision-one")document.documentElement.setAttribute("data-brand",b)}catch(e){}`;
