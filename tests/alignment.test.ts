import { describe, expect, it } from "vitest";
import { distributeWords, estimateAlignment, parseSilences, tokenize, wordsFromCharAlignment } from "@/lib/captions/alignment";

describe("alignment", () => {
  it("distribuye palabras de forma monótona dentro del intervalo", () => {
    const w = distributeWords(tokenize("Hola, esto es una prueba. Segunda frase aquí."), 1, 5);
    expect(w).toHaveLength(8);
    expect(w[0].start).toBeCloseTo(1, 2);
    expect(w.at(-1)!.end).toBeCloseTo(5, 1);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].end - 1e-6);
  });

  it("ancla límites de frase a silencios reales", () => {
    const silences = [{ start: 0, end: 0.4 }, { start: 2.9, end: 3.4 }, { start: 6.0, end: 6.5 }];
    const w = estimateAlignment("Primera frase corta aquí. Segunda frase también corta.", 6.5, silences);
    const firstOfSecond = w.find((x) => x.text === "Segunda")!;
    expect(firstOfSecond.start).toBeCloseTo(3.4, 1);
    expect(w[0].start).toBeCloseTo(0.4, 1);
    expect(w.at(-1)!.end).toBeLessThanOrEqual(6.0 + 1e-6);
  });

  it("convierte la alineación por carácter de ElevenLabs a palabras", () => {
    const text = "Hola mundo";
    const chars = text.split("");
    const w = wordsFromCharAlignment({ characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.1), character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1) });
    expect(w).toEqual([{ text: "Hola", start: 0, end: 0.4 }, { text: "mundo", start: 0.5, end: 1 }]);
  });

  it("parsea la salida de silencedetect", () => {
    const s = parseSilences("[silencedetect @ 0x1] silence_start: 1.25\n[silencedetect @ 0x1] silence_end: 1.8 | silence_duration: 0.55\n");
    expect(s).toEqual([{ start: 1.25, end: 1.8 }]);
  });
});
