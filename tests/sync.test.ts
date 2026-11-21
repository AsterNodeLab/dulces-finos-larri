import { describe, expect, it } from "vitest";
import { syncSpec } from "@/lib/storyboard/sync";
import { VideoSpecSchema, totalDurationInFrames, type VideoSpec } from "@/shared/schema";
import { distributeWords, tokenize } from "@/lib/captions/alignment";

const base: VideoSpec = VideoSpecSchema.parse({
  version: 1,
  brand: "vision-one",
  template: "ai-explainer",
  title: "Prueba",
  fps: 30,
  scenes: [
    { id: "a", type: "AnimatedHook", narration: "Uno dos tres cuatro.", durationInFrames: 90, props: { headline: "Hola" } },
    { id: "b", type: "EditorialTitle", narration: "Cinco seis siete ocho nueve diez.", durationInFrames: 90, props: { title: "Título" } },
    { id: "c", type: "BrandedOutro", narration: "Once doce.", durationInFrames: 90, props: { message: "Fin" } },
  ],
  captions: { words: [] },
});

describe("syncSpec", () => {
  it("sin audio estima duraciones y genera subtítulos de previsualización", () => {
    const s = syncSpec({ spec: base, audio: null });
    expect(s.audio).toBeUndefined();
    expect(s.captions.words.length).toBe(12);
    expect(s.scenes.every((x) => x.durationInFrames >= 45)).toBe(true);
  });

  it("con audio, cada escena empieza con su primera palabra y el total cubre el audio", () => {
    const text = base.scenes.map((s) => s.narration).join(" ");
    const words = distributeWords(tokenize(text), 0.2, 9.8);
    const s = syncSpec({ spec: base, audio: { src: "projects/x/n.wav", durationInSeconds: 10, words } });
    const startB = s.scenes[0].durationInFrames / 30;
    const cinco = words.find((w) => w.text === "Cinco")!;
    expect(Math.abs(startB - (cinco.start - 0.12))).toBeLessThan(0.05);
    expect(totalDurationInFrames(s) / 30).toBeGreaterThanOrEqual(10);
    expect(s.audio?.src).toBe("projects/x/n.wav");
    expect(VideoSpecSchema.safeParse(s).success).toBe(true);
  });

  it("respeta la duración mínima de escena aunque una escena casi no tenga palabras", () => {
    const spec = { ...base, scenes: base.scenes.map((x, i) => (i === 1 ? { ...x, narration: "Cinco." } : x)) } as VideoSpec;
    const text = spec.scenes.map((s) => s.narration).join(" ");
    const words = distributeWords(tokenize(text), 0, 3);
    const s = syncSpec({ spec, audio: { src: "a.wav", durationInSeconds: 3, words } });
    expect(s.scenes.every((x) => x.durationInFrames >= 45)).toBe(true);
  });
});
