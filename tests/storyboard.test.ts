import { describe, expect, it } from "vitest";
import { clip, sceneFromSegment, scenesFromDirector, splitNarration } from "@/lib/storyboard/service";
import { SceneSchema, type ScriptSegment } from "@/shared/schema";
import { demoScenes, demoNarrationText, demoScript } from "@/content/demo-project";
import { buildOfflineScript } from "@/content/script-templates";

const ctx = { brand: "vision-one" as const, template: "ai-explainer" as const, sources: [] };

describe("storyboard", () => {
  it("clip recorta en límite de palabra", () => {
    expect(clip("uno dos tres cuatro cinco", 12)).toBe("uno dos…");
    expect(clip("corto", 12)).toBe("corto");
  });

  it("splitNarration no pierde palabras", () => {
    const t = "Primera oración. Segunda oración. Tercera oración.";
    expect(splitNarration(t, 2).join(" ")).toBe(t);
  });

  it("genera una escena válida para cada rol del guion offline (sin inventar datos)", () => {
    for (const format of ["launch", "tutorial", "concept", "comparison"] as const) {
      const segs = buildOfflineScript({ idea: "Qué es MCP", brand: "vision-one", summary: "", claims: [], settings: { targetDuration: 45, format, audience: "general", complexity: "basic", style: "teacher" } });
      segs.forEach((s, i) => {
        const sc = sceneFromSegment(s, i, ctx);
        expect(SceneSchema.safeParse(sc).success).toBe(true);
        expect(["MetricCounter", "AIModelComparison", "TimelineScene"]).not.toContain(sc.type);
      });
    }
  });

  it("el Motion Director: escenas inválidas se sustituyen y la narración se conserva", () => {
    const segs: ScriptSegment[] = [
      { id: "s1", role: "hook", text: "Hola. Esto es una prueba.", claimIds: [] },
      { id: "s2", role: "cta", text: "Sígueme.", claimIds: [] },
    ];
    const out = {
      scenes: [
        { segmentId: "s1", type: "AnimatedHook" as const, props: { headline: "Hola" } },
        { segmentId: "s1", type: "MetricCounter" as const, props: { label: "x" } }, // inválida: falta value
        { segmentId: "s2", type: "BrandedOutro" as const, props: { message: "Gracias" } },
      ],
    };
    const { scenes, rejected } = scenesFromDirector(out, segs, ctx);
    expect(rejected).toBe(1);
    expect(scenes).toHaveLength(3);
    expect(scenes.map((s) => s.narration).join(" ").replace(/\s+/g, " ").trim()).toBe("Hola. Esto es una prueba. Sígueme.");
  });

  it("el demo: escenas válidas y narración concatenada idéntica al guion", () => {
    demoScenes.forEach((s) => expect(SceneSchema.safeParse(s).success).toBe(true));
    expect(demoScenes.map((s) => s.narration).join(" ")).toBe(demoNarrationText());
    expect(demoScript.approvedAt).not.toBeNull();
  });
});
