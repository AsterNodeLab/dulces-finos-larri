/**
 * Sincronía narración ↔ escenas (función pura, testeada en tests/sync.test.ts).
 * Con audio: el inicio de cada escena = inicio de su primera palabra; la última escena dura hasta el fin del audio
 * (+ cola). Sin audio: duración estimada por palabras (≈2.5 palabras/s).
 */
import { SPANISH_WPS, type Scene, type VideoSpec, type WordTiming } from "@/shared/schema";
import { distributeWords, tokenize } from "../captions/alignment";

const MIN_SCENE_S = 1.5;
const TAIL_S = 0.8;

export function estimatedSceneFrames(s: Scene, fps: number): number {
  const words = tokenize(s.narration).length;
  const secs = Math.max(words ? words / SPANISH_WPS + 0.4 : 3, MIN_SCENE_S);
  return Math.round(secs * fps);
}

/** Índice de la primera palabra de cada escena dentro de `words`. Si el texto alineado difiere (whisper), proporcional. */
function sceneWordStarts(scenes: Scene[], words: WordTiming[]): number[] {
  const counts = scenes.map((s) => tokenize(s.narration).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const starts: number[] = [];
  let acc = 0;
  for (const c of counts) {
    starts.push(total === words.length ? acc : Math.round((acc / Math.max(total, 1)) * words.length));
    acc += c;
  }
  return starts;
}

export interface SyncInput {
  spec: VideoSpec;
  audio: { src: string; durationInSeconds: number; words: WordTiming[] } | null;
}

export function syncSpec({ spec, audio }: SyncInput): VideoSpec {
  const fps = spec.fps;
  if (!audio) {
    const scenes = spec.scenes.map((s) => (s.lockedDuration ? s : { ...s, durationInFrames: estimatedSceneFrames(s, fps) }));
    // Subtítulos de previsualización: palabras estimadas sobre la línea de tiempo de las escenas.
    const words: WordTiming[] = [];
    let t = 0;
    for (const s of scenes) {
      const d = s.durationInFrames / fps;
      words.push(...distributeWords(tokenize(s.narration), t + 0.15, t + d - 0.25));
      t += d;
    }
    return { ...spec, scenes, audio: undefined, captions: { ...spec.captions, words } };
  }

  const words = audio.words;
  const starts = sceneWordStarts(spec.scenes, words);
  const n = spec.scenes.length;
  const endTotal = audio.durationInSeconds + TAIL_S;
  const boundaries: number[] = spec.scenes.map((_, i) => {
    if (i === 0) return 0;
    const w = words[Math.min(starts[i], words.length - 1)];
    return w ? Math.max(0, w.start - 0.12) : (endTotal * i) / n;
  });
  boundaries.push(endTotal);
  // Garantiza duración mínima y monotonía.
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] < boundaries[i - 1] + MIN_SCENE_S) boundaries[i] = boundaries[i - 1] + MIN_SCENE_S;
  }
  const frames = boundaries.map((b) => Math.round(b * fps));
  const scenes = spec.scenes.map((s, i) => ({ ...s, durationInFrames: Math.max(15, frames[i + 1] - frames[i]) }));
  return {
    ...spec,
    scenes,
    audio: { src: audio.src, durationInSeconds: audio.durationInSeconds, volume: spec.audio?.volume ?? 1 },
    captions: { ...spec.captions, words },
  };
}
