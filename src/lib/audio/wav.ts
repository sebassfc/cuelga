export type InfoWav = {
  sampleRate: number;
  canales: number;
  bitsPorMuestra: number;
  byteRate: number;
  bloque: number;
  inicioDatos: number;
  bytesDatos: number;
};

function vista(wav: Uint8Array) {
  return new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
}

/** Lee el encabezado RIFF/WAVE (PCM). Lanza error si no es un WAV PCM. */
export function leerWav(wav: Uint8Array): InfoWav {
  const v = vista(wav);
  if (wav.byteLength < 44 || v.getUint32(0, false) !== 0x52494646 || v.getUint32(8, false) !== 0x57415645) {
    throw new Error("No es un WAV RIFF/WAVE");
  }
  let fmt: Omit<InfoWav, "inicioDatos" | "bytesDatos"> | null = null;
  let offset = 12;
  while (offset + 8 <= wav.byteLength) {
    const id = v.getUint32(offset, false);
    const tam = v.getUint32(offset + 4, true);
    if (id === 0x666d7420 /* "fmt " */) {
      if (v.getUint16(offset + 8, true) !== 1) throw new Error("Solo se acepta WAV PCM sin compresión");
      fmt = {
        canales: v.getUint16(offset + 10, true),
        sampleRate: v.getUint32(offset + 12, true),
        byteRate: v.getUint32(offset + 16, true),
        bloque: v.getUint16(offset + 20, true),
        bitsPorMuestra: v.getUint16(offset + 22, true),
      };
    } else if (id === 0x64617461 /* "data" */) {
      if (!fmt) throw new Error("WAV con bloque data antes de fmt");
      return { ...fmt, inicioDatos: offset + 8, bytesDatos: Math.min(tam, wav.byteLength - offset - 8) };
    }
    offset += 8 + tam + (tam % 2);
  }
  throw new Error("WAV sin bloque data");
}

export function duracionWavMs(wav: Uint8Array): number {
  const i = leerWav(wav);
  return Math.round((i.bytesDatos / i.byteRate) * 1000);
}

/** Arma un WAV PCM a partir de muestras crudas con el formato de `info`. */
export function armarWav(info: Pick<InfoWav, "sampleRate" | "canales" | "bitsPorMuestra">, pcm: Uint8Array): Uint8Array<ArrayBuffer> {
  const bloque = info.canales * (info.bitsPorMuestra / 8);
  const out = new Uint8Array(44 + pcm.byteLength);
  const v = new DataView(out.buffer);
  const ascii = (o: number, s: string) => [...s].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  ascii(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, info.canales, true);
  v.setUint32(24, info.sampleRate, true);
  v.setUint32(28, info.sampleRate * bloque, true);
  v.setUint16(32, bloque, true);
  v.setUint16(34, info.bitsPorMuestra, true);
  ascii(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}

/**
 * Corta un WAV en trozos de `ms` (el último puede ser más corto), cada uno con su propio encabezado.
 * Sirve para el modo pseudo-tiempo-real: la app manda un trozo cada pocos segundos.
 */
export function cortarWav(wav: Uint8Array, ms: number): { inicioMs: number; wav: Uint8Array<ArrayBuffer> }[] {
  if (!(ms > 0)) throw new Error("La duración del trozo debe ser mayor a 0");
  const info = leerWav(wav);
  const bytesPorTrozo = Math.max(info.bloque, Math.floor((info.byteRate * ms) / 1000 / info.bloque) * info.bloque);
  const datos = wav.subarray(info.inicioDatos, info.inicioDatos + info.bytesDatos);
  const trozos: { inicioMs: number; wav: Uint8Array<ArrayBuffer> }[] = [];
  for (let o = 0; o < datos.byteLength; o += bytesPorTrozo) {
    trozos.push({
      inicioMs: Math.round((o / info.byteRate) * 1000),
      wav: armarWav(info, datos.subarray(o, Math.min(o + bytesPorTrozo, datos.byteLength))),
    });
  }
  return trozos;
}

export function aBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}
