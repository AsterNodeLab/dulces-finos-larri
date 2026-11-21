"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, errorMessage } from "./api-client";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: T | null | ((prev: T | null) => T | null)) => void;
}

/** Carga GET `path` (null = no cargar). Mantiene los datos previos durante recargas silenciosas. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<{ forPath: string | null; data: T | null; error: string | null; loading: boolean }>({
    forPath: path,
    data: null,
    error: null,
    loading: path !== null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    api<T>(path, { signal: ctrl.signal })
      .then((data) => setState({ forPath: path, data, error: null, loading: false }))
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setState((s) => ({ forPath: path, data: s.forPath === path ? s.data : null, error: errorMessage(e), loading: false }));
      });
    return () => ctrl.abort();
  }, [path, tick]);

  // Si cambió la URL, los datos del estado pertenecen a otra y no se muestran.
  const current = state.forPath === path ? state : { forPath: path, data: null, error: null, loading: path !== null };

  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: null, loading: s.data === null }));
    setTick((t) => t + 1);
  }, []);
  const setData = useCallback((updater: T | null | ((prev: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? (updater as (p: T | null) => T | null)(s.data) : updater }));
  }, []);
  return { data: current.data, error: current.error, loading: current.loading, reload, setData };
}

/** Ejecuta `fn` cada `ms` mientras `active` sea true. */
export function useInterval(fn: () => void, ms: number, active: boolean) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

/** Media query reactiva (false en SSR). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
