/**
 * Fuentes locales (offline) vía @fontsource-variable. Los CSS se empaquetan con los .woff2.
 * waitForFonts() se usa con delayRender/continueRender para que ningún frame se capture
 * con la fuente de respaldo.
 */
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

/** Combinaciones que realmente usan las escenas (peso/estilo). */
const FONT_PROBES = [
  '400 80px "Fraunces Variable"',
  '600 80px "Fraunces Variable"',
  'italic 400 80px "Fraunces Variable"',
  '400 40px "Inter Variable"',
  '600 40px "Inter Variable"',
  '500 30px "JetBrains Mono Variable"',
];

/** Texto de prueba con acentos para forzar la descarga de los subconjuntos latin/latin-ext. */
const SAMPLE = "Aa ñ áéíóú ¿? 0123456789";

export async function waitForFonts(timeoutMs = 15000): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const load = Promise.all(FONT_PROBES.map((f) => document.fonts.load(f, SAMPLE))).then(() => document.fonts.ready);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([load.then(() => undefined), timeout]);
}
