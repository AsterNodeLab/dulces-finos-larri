/** Registro de composiciones de Remotion. */
import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { CompositionPropsSchema, totalDurationInFrames, type CompositionProps } from "../src/shared/schema";
import { VideoComposition } from "./VideoComposition";
import { gallerySpec } from "./fixtures/gallery-spec";

/** Duración y formato salen SIEMPRE del spec validado. */
const calculateMetadata: CalculateMetadataFunction<CompositionProps> = ({ props }) => {
  const parsed = CompositionPropsSchema.parse(props);
  return {
    durationInFrames: totalDurationInFrames(parsed.spec),
    fps: parsed.spec.fps,
    width: parsed.spec.width,
    height: parsed.spec.height,
    props: parsed,
  };
};

const defaultProps: CompositionProps = { spec: gallerySpec, assetBaseUrl: null };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="VisionQuantVideo"
      component={VideoComposition}
      schema={CompositionPropsSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={defaultProps}
      durationInFrames={totalDurationInFrames(gallerySpec)}
      fps={gallerySpec.fps}
      width={gallerySpec.width}
      height={gallerySpec.height}
    />
    <Composition
      id="SceneGallery"
      component={VideoComposition}
      schema={CompositionPropsSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={defaultProps}
      durationInFrames={totalDurationInFrames(gallerySpec)}
      fps={gallerySpec.fps}
      width={gallerySpec.width}
      height={gallerySpec.height}
    />
  </>
);
