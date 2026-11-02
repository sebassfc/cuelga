import { armarWav } from "../audio/wav";

/**
 * Captura en el navegador: micrófono (la llamada en altavoz) o un archivo (la recreación grabada),
 * remuestreada a 16 kHz mono PCM y mandada al servidor en trozos WAV.
 */

export const RATE = 16_000;

const WORKLET = `
class CapturaCuelga extends AudioWorkletProcessor {
  process(inputs) {
    const canal = inputs[0] && inputs[0][0];
    if (canal) this.port.postMessage(canal.slice(0));
    return true;
  }
}
registerProcessor("captura-cuelga", CapturaCuelga);
`;

/** Remuestreo por promedio de ventana: suficiente para voz y sin dependencias. */
class Remuestreo {
  private readonly paso: number;
  private avance = 0;
  private suma = 0;
  private n = 0;

  constructor(rateEntrada: number) {
    this.paso = rateEntrada / RATE;
  }

  empujar(x: Float32Array): Int16Array {
    const out = new Int16Array(Math.ceil(x.length / this.paso) + 1);
    let k = 0;
    for (let i = 0; i < x.length; i++) {
      this.suma += x[i];
      this.n++;
      this.avance++;
      if (this.avance >= this.paso) {
        this.avance -= this.paso;
        const v = Math.max(-1, Math.min(1, this.suma / this.n));
        out[k++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.suma = 0;
        this.n = 0;
      }
    }
    return out.subarray(0, k);
  }
}

export type Fuente = { detener: () => void; terminada: Promise<void> };

async function nodoCaptura(ctx: AudioContext, alMuestras: (m: Int16Array) => void): Promise<AudioWorkletNode> {
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  const nodo = new AudioWorkletNode(ctx, "captura-cuelga");
  const r = new Remuestreo(ctx.sampleRate);
  nodo.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const m = r.empujar(e.data);
    if (m.length > 0) alMuestras(m);
  };
  // El nodo solo procesa si el grafo llega al destino; se conecta en silencio.
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  nodo.connect(mudo).connect(ctx.destination);
  return nodo;
}

function promesaFin() {
  let fin!: () => void;
  const terminada = new Promise<void>((r) => (fin = r));
  return { terminada, fin };
}

export async function desdeMicrofono(alMuestras: (m: Int16Array) => void): Promise<Fuente> {
  // Sin cancelación de eco: la voz del extorsionador sale de OTRO teléfono en altavoz, no de este dispositivo.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  const ctx = new AudioContext();
  await ctx.resume();
  const nodo = await nodoCaptura(ctx, alMuestras);
  ctx.createMediaStreamSource(stream).connect(nodo);
  const { terminada, fin } = promesaFin();
  return {
    detener: () => {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      fin();
    },
    terminada,
  };
}

/** Reproduce el archivo en las bocinas (para que se oiga en el video) y a la vez lo escucha. */
export async function desdeArchivo(archivo: Blob, alMuestras: (m: Int16Array) => void): Promise<Fuente & { duracionSeg: number }> {
  const ctx = new AudioContext();
  // Si el archivo se eligió en otro diálogo, el contexto puede nacer suspendido.
  await ctx.resume();
  const buffer = await ctx.decodeAudioData(await archivo.arrayBuffer());
  const nodo = await nodoCaptura(ctx, alMuestras);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.connect(nodo);
  const { terminada, fin } = promesaFin();
  src.onended = () => {
    // Deja pasar el último bloque del worklet antes de cerrar.
    setTimeout(() => {
      void ctx.close();
      fin();
    }, 300);
  };
  src.start();
  return {
    detener: () => {
      try {
        src.stop();
      } catch {
        // ya se había detenido
      }
    },
    terminada,
    duracionSeg: buffer.duration,
  };
}

function rms(m: Int16Array): number {
  let s = 0;
  for (let i = 0; i < m.length; i++) s += (m[i] / 0x8000) ** 2;
  return Math.sqrt(s / Math.max(1, m.length));
}

/**
 * Junta muestras y manda un trozo cuando hay al menos `minSeg` y no hay otro en camino.
 * Si el servidor tarda, el siguiente trozo sale más largo (hasta `maxSeg`) en vez de hacer fila.
 * Los trozos casi en silencio no se mandan: no hay nada que oír y cuestan.
 */
export class Emisor {
  private partes: Int16Array[] = [];
  private muestras = 0;
  private enVuelo: Promise<void> | null = null;
  private cerrado = false;
  silenciosOmitidos = 0;

  constructor(
    private readonly enviar: (wav: Blob) => Promise<void>,
    private readonly minSeg = 6,
    private readonly maxSeg = 15,
  ) {}

  empujar(m: Int16Array) {
    if (this.cerrado) return;
    this.partes.push(m);
    this.muestras += m.length;
    this.bombear();
  }

  /** Manda lo que queda y espera a que termine todo lo pendiente. */
  async cerrar() {
    this.cerrado = true;
    for (let vueltas = 0; vueltas < 20; vueltas++) {
      if (this.enVuelo) await this.enVuelo;
      else if (this.muestras > RATE / 2) this.bombear();
      else return;
    }
  }

  private tomar(max: number): Int16Array {
    const out = new Int16Array(Math.min(max, this.muestras));
    let k = 0;
    while (k < out.length) {
      const p = this.partes[0];
      const n = Math.min(p.length, out.length - k);
      out.set(p.subarray(0, n), k);
      k += n;
      if (n === p.length) this.partes.shift();
      else this.partes[0] = p.subarray(n);
    }
    this.muestras -= out.length;
    return out;
  }

  private bombear(): void {
    if (this.enVuelo) return;
    const listo = this.muestras >= this.minSeg * RATE || (this.cerrado && this.muestras > RATE / 2);
    if (!listo) return;
    const pcm = this.tomar(this.maxSeg * RATE);
    if (rms(pcm) < 0.003) {
      this.silenciosOmitidos++;
      return this.bombear();
    }
    const wav = armarWav({ sampleRate: RATE, canales: 1, bitsPorMuestra: 16 }, new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
    this.enVuelo = this.enviar(new Blob([wav], { type: "audio/wav" }))
      .catch(() => {})
      .finally(() => {
        this.enVuelo = null;
        this.bombear();
      });
  }
}
