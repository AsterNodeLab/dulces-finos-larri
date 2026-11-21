import { describe, expect, it } from "vitest";
import { buildSrt } from "@/lib/captions/srt";
import { syncSpec } from "@/lib/storyboard/sync";
import { VideoSpecSchema } from "@/shared/schema";

describe("SRT", () => {
  it("produce bloques numerados con tiempos válidos y ≤ 2 líneas", () => {
    const spec = syncSpec({
      spec: VideoSpecSchema.parse({ version: 1, brand: "vision-one", template: "ai-explainer", title: "x", scenes: [{ id: "a", type: "EditorialTitle", narration: "Un agente de inteligencia artificial decide los pasos para cumplir un objetivo. Usa herramientas.", durationInFrames: 150, props: { title: "x" } }], captions: {} }),
      audio: null,
    });
    const srt = buildSrt(spec);
    const blocks = srt.trim().split(/\n\n/);
    expect(blocks.length).toBeGreaterThan(1);
    for (const b of blocks) {
      const lines = b.split("\n");
      expect(lines[1]).toMatch(/^\d\d:\d\d:\d\d,\d{3} --> \d\d:\d\d:\d\d,\d{3}$/);
      expect(lines.length - 2).toBeLessThanOrEqual(2);
    }
  });
});
