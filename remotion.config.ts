import { Config } from "@remotion/cli/config";

// Config solo para `remotion studio` (CLI). El render de producción usa scripts/render-worker.ts.
Config.setVideoImageFormat("jpeg");
Config.setConcurrency(Number(process.env.RENDER_CONCURRENCY ?? 2));
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
