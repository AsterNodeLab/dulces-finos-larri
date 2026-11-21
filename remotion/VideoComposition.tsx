/**
 * Composición principal: convierte un VideoSpec VALIDADO en frames.
 * Importable en el navegador por @remotion/player (sin imports de Node, solo rutas relativas).
 *
 * Capas (de atrás hacia adelante): fondo de marca → escenas en serie → subtítulos →
 * marca de demo / firma. Audio y música en paralelo desde el frame 0.
 *
 * Regla de tiempo: duración total = Σ scene.durationInFrames; la escena N empieza en la suma
 * de las anteriores. Las transiciones son animaciones de ENTRADA dentro de cada escena.
 */
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Html5Audio, Series, continueRender, delayRender } from "remotion";
import { BRANDS } from "../src/shared/brands";
import type { CompositionProps } from "../src/shared/schema";
import { fonts, videoFormat } from "../src/shared/tokens";
import { waitForFonts } from "./fonts";
import { resolveAsset } from "./lib/assets";
import { Background } from "./primitives/Background";
import { SceneFrame } from "./primitives/SceneFrame";
import { alpha } from "./primitives/layout";
import { SceneRenderer } from "./scenes";
import { Captions } from "./captions/Captions";

/** Bloquea el render hasta que las fuentes locales estén listas (también en el Player). */
function useFontsReady(): void {
  const [handle] = useState(() => delayRender("Cargando fuentes de VisionQuant"));
  useEffect(() => {
    let done = false;
    waitForFonts()
      .catch(() => undefined)
      .finally(() => {
        if (!done) {
          done = true;
          continueRender(handle);
        }
      });
    return () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
  }, [handle]);
}

export function VideoComposition({ spec, assetBaseUrl }: CompositionProps) {
  useFontsReady();
  const brand = BRANDS[spec.brand];
  const c = brand.colors;
  const base = assetBaseUrl ?? null;
  const safe = videoFormat.safe;

  return (
    <AbsoluteFill style={{ backgroundColor: c.background, fontFamily: fonts.sans, color: c.text }}>
      <Background brand={brand} />

      <Series>
        {spec.scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames} name={`${scene.type} · ${scene.id}`} premountFor={15}>
            <SceneFrame transition={scene.transition} camera={scene.camera} durationInFrames={scene.durationInFrames}>
              <SceneRenderer scene={scene} brand={brand} assetBaseUrl={base} />
            </SceneFrame>
          </Series.Sequence>
        ))}
      </Series>

      <Captions settings={spec.captions} brand={brand} />

      {/* Marca de agua de demostración (arriba a la izquierda, dentro de la zona segura) */}
      {spec.demoWatermark ? (
        <div
          style={{
            position: "absolute",
            left: safe.left,
            top: safe.top,
            padding: "6px 12px",
            border: `1px solid ${alpha(c.text, 0.25)}`,
            borderRadius: 6,
            fontFamily: fonts.mono,
            fontSize: 22,
            letterSpacing: "0.12em",
            color: alpha(c.text, 0.7),
          }}
        >
          DEMO · voz sintética
        </div>
      ) : null}

      {/* Firma de marca discreta (arriba a la derecha, antes de la columna de acciones) */}
      <div
        style={{
          position: "absolute",
          right: safe.right,
          top: safe.top + 6,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: fonts.mono,
          fontSize: 22,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: alpha(c.text, 0.6),
        }}
      >
        <div style={{ width: 8, height: 8, background: c.accent, transform: "rotate(45deg)" }} />
        {brand.signature}
      </div>

      {spec.audio ? <Html5Audio src={resolveAsset(spec.audio.src, base)} volume={spec.audio.volume} /> : null}
      {spec.music ? <Html5Audio src={resolveAsset(spec.music.src, base)} volume={Math.min(spec.music.volume, 0.35)} loop /> : null}
    </AbsoluteFill>
  );
}
