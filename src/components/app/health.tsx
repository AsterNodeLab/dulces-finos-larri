"use client";
import * as React from "react";
import { api } from "./api-client";
import type { HealthInfo } from "./types";

interface HealthCtx {
  health: HealthInfo | null;
  reload: () => void;
}
const Ctx = React.createContext<HealthCtx>({ health: null, reload: () => undefined });

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = React.useState<HealthInfo | null>(null);
  const load = React.useCallback(() => {
    api<HealthInfo>("/api/health")
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);
  const value = React.useMemo(() => ({ health, reload: load }), [health, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHealth() {
  return React.useContext(Ctx);
}
