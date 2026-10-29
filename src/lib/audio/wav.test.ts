import { describe, expect, it } from "vitest";
import { armarWav, cortarWav, duracionWavMs, leerWav } from "./wav";

/** Silencio PCM16 mono a 24 kHz de `ms` milisegundos. */
function silencio(ms: number, sampleRate = 24_000) {
  return armarWav({ sampleRate, canales: 1, bitsPorMuestra: 16 }, new Uint8Array(Math.round((sampleRate * ms) / 1000) * 2));
}

describe("wav", () => {
  it("lee el encabezado que arma", () => {
    const info = leerWav(silencio(1_000));
    expect(info).toMatchObject({ sampleRate: 24_000, canales: 1, bitsPorMuestra: 16, byteRate: 48_000, bytesDatos: 48_000 });
  });

  it("calcula la duración", () => {
    expect(duracionWavMs(silencio(2_500))).toBe(2_500);
  });

  it("rechaza algo que no es WAV", () => {
    expect(() => leerWav(new Uint8Array(100))).toThrow(/WAV/);
  });

  it("corta en trozos válidos que suman la duración original", () => {
    const trozos = cortarWav(silencio(13_000), 5_000);
    expect(trozos.map((t) => t.inicioMs)).toEqual([0, 5_000, 10_000]);
    expect(trozos.map((t) => duracionWavMs(t.wav))).toEqual([5_000, 5_000, 3_000]);
  });

  it("no parte una muestra a la mitad", () => {
    for (const t of cortarWav(silencio(1_003, 16_000), 333)) expect(leerWav(t.wav).bytesDatos % 2).toBe(0);
  });
});
