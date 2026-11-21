"use client";
import * as React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoComposition } from "../../../remotion/VideoComposition";
import { totalDurationInFrames, type VideoSpec } from "@/shared/schema";

/** Remotion Player 9:16 alimentado por preview-spec. Solo cliente. */
export default function PreviewPlayer({
  spec,
  assetBaseUrl,
  playerRef,
  showSafe,
}: {
  spec: VideoSpec;
  assetBaseUrl: string;
  playerRef: React.Ref<PlayerRef>;
  showSafe: boolean;
}) {
  const inputProps = React.useMemo(() => ({ spec, assetBaseUrl }), [spec, assetBaseUrl]);
  const duration = Math.max(1, totalDurationInFrames(spec));
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-petrol-950">
      <Player
        ref={playerRef}
        component={VideoComposition}
        inputProps={inputProps}
        durationInFrames={duration}
        fps={spec.fps}
        compositionWidth={spec.width}
        compositionHeight={spec.height}
        controls
        loop={false}
        initialFrame={Math.min(Math.round(spec.fps), duration - 1)}
        clickToPlay
        acknowledgeRemotionLicense
        style={{ width: "100%" }}
      />
      {showSafe && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute border border-dashed border-accent/70"
            style={{ top: "8.33%", bottom: "19.79%", left: "6.67%", right: "14.81%" }}
          />
          <span className="absolute top-1 left-2 font-mono text-[9px] tracking-wider text-accent/80 uppercase">Zona segura</span>
        </div>
      )}
    </div>
  );
}
