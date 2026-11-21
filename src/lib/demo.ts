/**
 * Proyecto de DEMOSTRACIÓN: "¿Qué es un agente de inteligencia artificial y por qué importa?" (Vision One).
 * Todo su contenido está marcado como demo (isDemo, provider "demo", marca de agua en el video).
 * La narración es una voz sintética (espeak-ng/MBROLA) versionada en assets/demo/.
 */
import fs from "node:fs";
import path from "node:path";
import { DEMO_CAPTION_KEYWORDS, DEMO_PROJECT, demoResearch, demoScenes, demoScript } from "@/content/demo-project";
import { VideoSpecSchema, type WordTiming } from "@/shared/schema";
import { mediaAbs, mediaRel } from "./paths";
import { createProject, listProjects, saveNarration, saveResearch, saveScript, saveStoryboard, updateProject } from "./store";
import { applyNarration } from "./storyboard/service";

export function findDemoProject() {
  return listProjects().find((p) => p.isDemo) ?? null;
}

export function createDemoProject() {
  const p = createProject({ ...DEMO_PROJECT, isDemo: true, scheduledFor: null });
  saveResearch(p.id, { ...demoResearch });
  saveScript(p.id, demoScript.segments, demoScript.settings, "demo", demoScript.approvedAt);

  const voiceDir = path.join(process.cwd(), "assets", "demo");
  const mp3 = path.join(voiceDir, "narration-demo.mp3");
  const meta = path.join(voiceDir, "narration-demo.json");
  if (fs.existsSync(mp3) && fs.existsSync(meta)) {
    const rel = mediaRel("projects", p.id, "narration-demo.mp3");
    fs.mkdirSync(path.dirname(mediaAbs(rel)), { recursive: true });
    fs.copyFileSync(mp3, mediaAbs(rel));
    const m = JSON.parse(fs.readFileSync(meta, "utf8")) as { durationInSeconds: number; words: WordTiming[] };
    saveNarration(p.id, { kind: "demo-tts", filePath: rel, mime: "audio/mpeg", durationInSeconds: m.durationInSeconds, alignmentSource: "estimated", words: m.words });
  }

  const spec = VideoSpecSchema.parse({
    version: 1,
    brand: DEMO_PROJECT.brand,
    template: DEMO_PROJECT.template,
    title: DEMO_PROJECT.title,
    fps: 30,
    scenes: demoScenes,
    captions: { enabled: true, position: "lower", keywords: DEMO_CAPTION_KEYWORDS, maxCharsPerLine: 26, words: [] },
    demoWatermark: true,
  });
  saveStoryboard(p.id, applyNarration(p.id, spec), "demo");
  return updateProject(p.id, { status: "production" })!;
}
