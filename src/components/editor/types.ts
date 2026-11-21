import type { VideoSpec } from "@/shared/schema";
import type { ProjectBundle } from "@/components/app/types";

export const TAB_IDS = ["research", "script", "storyboard", "voice", "render", "metrics"] as const;
export type TabId = (typeof TAB_IDS)[number];

/** Contexto común que recibe cada pestaña del workspace. */
export interface TabCtx {
  id: string;
  bundle: ProjectBundle;
  /** Mezcla parcial sobre el bundle local (respuestas de la API). */
  patch: (p: Partial<ProjectBundle>) => void;
  /** Recarga silenciosa del proyecto completo. */
  reload: () => void;
  /** Vuelve a pedir preview-spec (tras guardar guion/storyboard/voz). */
  refreshPreview: () => void;
  goTab: (t: TabId) => void;
  /** Mueve el Player a un frame. */
  seek: (frame: number) => void;
  previewSpec: VideoSpec | null;
}
