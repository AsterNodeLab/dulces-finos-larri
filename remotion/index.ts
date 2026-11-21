/** Punto de entrada del bundle de Remotion (CLI, Studio y worker de render). */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
