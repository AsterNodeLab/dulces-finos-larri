/** Props comunes que recibe cada componente de escena. */
import type { BrandProfile } from "../../src/shared/brands";
import type { ScenePropsOf, SceneType } from "../../src/shared/schema";

export interface SceneComponentProps<T extends SceneType> {
  props: ScenePropsOf<T>;
  brand: BrandProfile;
  durationInFrames: number;
  /** Necesario para resolver assets (p. ej. referenceImage del personaje). */
  assetBaseUrl: string | null;
}
