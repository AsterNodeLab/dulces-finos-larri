import type {
  Asset,
  MetricEntry,
  Narration,
  Project,
  RenderJob,
  Research,
  Script,
  VideoSpec,
} from "@/shared/schema";
import type { BrandId, BrandProfile } from "@/shared/brands";
import type { TemplateDefinition } from "@/shared/templates";
import type { ScriptTemplate } from "@/content/script-templates";
import type { ContentFormat } from "@/shared/schema";

export interface HealthInfo {
  ok: boolean;
  providers: { anthropic: boolean; anthropicModel: string; openai: boolean; elevenlabs: boolean; elevenlabsModel: string };
  tools: { ffmpeg: boolean; ffprobe: boolean; demoTts: boolean };
  render: { backend: string; concurrency: number; previewScale: number; x264Preset: string };
  mode: "ai" | "offline";
}

export interface UsageInfo {
  calls: {
    provider: string;
    model: string;
    operation: string;
    inputTokens: number;
    outputTokens: number;
    characters: number;
    estCostUsd: number | null;
    createdAt: string;
  }[];
  estTotalUsd: number;
  hasUnpricedCalls: boolean;
}

export interface StoryboardInfo {
  spec: VideoSpec;
  provider: string;
  updatedAt: string;
  rejected?: number;
}

export interface ScriptVersionInfo {
  version: number;
  provider: string;
  createdAt: string;
}

export interface ProjectBundle {
  project: Project;
  research: Research | null;
  script: Script | null;
  scriptVersions: ScriptVersionInfo[];
  storyboard: StoryboardInfo | null;
  narration: Narration | null;
  renders: RenderJob[];
  usage: UsageInfo;
}

export interface ProjectsResponse {
  projects: Project[];
  lastRender: Record<string, RenderJob | null>;
}

export interface TemplatesResponse {
  templates: TemplateDefinition[];
  scriptFormats: Record<ContentFormat, ScriptTemplate>;
  brands: Record<BrandId, BrandProfile>;
}

export interface RadarItemInfo {
  title: string;
  url: string;
  publishedAt: string | null;
  feed: string;
  brand: BrandId;
}

export interface RadarResponse {
  items: RadarItemInfo[];
  feeds: { label: string; url: string; ok: boolean; error?: string; count: number }[];
  fetchedAt: string;
}

export interface SettingsResponse {
  settings: Record<string, string>;
  providers: HealthInfo["providers"];
  render: { concurrency: number; previewScale: number; x264Preset: string; browser: string };
  envFile: string;
}

export type { Asset, MetricEntry, RenderJob };
