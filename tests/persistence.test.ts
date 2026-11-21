import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vq-test-"));
process.env.VQ_DATA_DIR = dir;

describe("persistencia SQLite", () => {
  let store: typeof import("@/lib/store");
  beforeAll(async () => {
    store = await import("@/lib/store");
  });

  it("crea, guarda guion versionado, aprueba y reabre el proyecto", () => {
    const p = store.createProject({ title: "Test", brand: "visionquant", template: "technology-news", idea: "Inflación en México" });
    expect(p.status).toBe("idea");
    const settings = { targetDuration: 30 as const, format: "concept" as const, audience: "general", complexity: "basic" as const, style: "analyst" as const };
    store.saveScript(p.id, [{ id: "seg-1", role: "hook", text: "Hola", claimIds: [] }], settings, "manual");
    store.saveScript(p.id, [{ id: "seg-1", role: "hook", text: "Hola de nuevo", claimIds: [] }], settings, "manual");
    store.advanceStatus(p.id, "script");
    store.approveScript(p.id);
    const again = store.getProject(p.id)!;
    expect(again.status).toBe("production");
    const s = store.getScript(p.id)!;
    expect(s.version).toBe(2);
    expect(s.approvedAt).not.toBeNull();
    expect(s.segments[0].text).toBe("Hola de nuevo");
    expect(store.listScriptVersions(p.id)).toHaveLength(2);
  });

  it("el estado no retrocede con advanceStatus", () => {
    const p = store.createProject({ title: "T2", brand: "vision-one", template: "ai-tutorial", idea: "" });
    store.advanceStatus(p.id, "review");
    store.advanceStatus(p.id, "research");
    expect(store.getProject(p.id)!.status).toBe("review");
  });

  it("render jobs: cola FIFO", () => {
    const p = store.createProject({ title: "T3", brand: "vision-one", template: "ai-explainer", idea: "" });
    const spec = { version: 1, brand: "vision-one", template: "ai-explainer", title: "x", fps: 30, width: 1080, height: 1920, scenes: [{ id: "a", type: "EditorialTitle", narration: "", durationInFrames: 60, transition: "fade", camera: "drift", lockedDuration: false, props: { title: "Hola" } }], captions: { enabled: true, position: "lower", keywords: [], maxCharsPerLine: 26, words: [] }, demoWatermark: false } as const;
    const a = store.createRenderJob(p.id, "preview", spec as never);
    store.createRenderJob(p.id, "final", spec as never);
    expect(store.nextQueuedJob()!.id).toBe(a.id);
  });
});
