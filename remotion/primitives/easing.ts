/** Curvas y utilidades de tiempo basadas en frames. Nada de CSS animations. */
import { Easing, interpolate } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Progreso 0→1 entre dos frames, con easing editorial y clamp. */
export function progress(frame: number, start: number, length: number, easing = easeOut): number {
  if (length <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + length], [0, 1], { ...clamp, easing });
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Reparte el momento de aparición de N elementos a lo largo de la escena,
 * para que se revelen en el orden en que la narración los explica.
 * startFrame: primer elemento; endFrac: fracción de la escena en la que aparece el último.
 */
export function staggerFrames(count: number, durationInFrames: number, startFrame = 14, endFrac = 0.68): number[] {
  const deadline = revealDeadline(durationInFrames);
  const last = Math.min(Math.round(durationInFrames * endFrac), deadline);
  // En escenas cortas el primer elemento también se adelanta.
  const first = Math.max(0, Math.min(startFrame, Math.floor(last * 0.25)));
  if (count <= 1) return [first];
  const step = Math.max(0, last - first) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(first + i * step));
}

/**
 * Frame límite en el que TODO lo de la escena debe estar revelado (incluida la animación
 * de entrada de ~14 frames): min(75 % de la escena, duración − 12) menos el largo de la animación.
 */
export const REVEAL_ANIM = 14;
export function revealDeadline(durationInFrames: number): number {
  return Math.max(0, Math.min(Math.round(durationInFrames * 0.75), durationInFrames - 12) - REVEAL_ANIM);
}

/** Acota un revelado de texto palabra por palabra: devuelve [inicio, span] dentro del límite. */
export function fitSpan(durationInFrames: number, start: number, desiredSpan: number): [number, number] {
  const deadline = revealDeadline(durationInFrames);
  const s = Math.min(start, Math.floor(deadline * 0.3));
  return [s, Math.max(0, Math.min(desiredSpan, deadline - s))];
}

/** Oscilación suave y determinista (respiración, deriva). */
export function wave(frame: number, fps: number, periodSeconds: number, phase = 0): number {
  return Math.sin((frame / fps) * ((2 * Math.PI) / periodSeconds) + phase);
}
