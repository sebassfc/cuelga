import { z } from "zod";
import type { Presupuesto } from "../budget";
import type { TurnoLlamada } from "../classifier";
import { chatJSON, type ParteContenido } from "../llm/client";
import type { ConfigProveedor } from "../llm/provider";
import { KEYWORDS_EXTORSION, transcribirWav } from "../meta/voz";
import { aBase64, duracionWavMs } from "./wav";

export const HABLANTES = ["llamante", "receptor", "desconocido"] as const;

export const TranscripcionTrozo = z.object({
  turnos: z
    .array(
      z.object({
        hablante: z.enum(HABLANTES).describe("llamante = quien marcó; receptor = quien contestó en casa"),
        texto: z.string().describe("Lo que se dijo, literal, sin resumir ni corregir"),
      }),
    )
    .describe("Turnos en orden; vacío si no se entiende nada"),
});

/** Estimación pesimista de tokens por segundo de audio, solo para reservar presupuesto. */
const TOKENS_AUDIO_POR_SEGUNDO = 100;

const INSTRUCCIONES = `Transcribe literalmente este fragmento de una llamada telefónica en altavoz.
Idioma: español de México, a veces con palabras en inglés.
Separa por turnos y marca quién habla: "llamante" es quien hizo la llamada; "receptor" es quien contestó en casa.
Usa el contexto anterior para mantener las mismas etiquetas. Si un tramo no se entiende, omítelo: no inventes texto.
Palabras que pueden aparecer: ${KEYWORDS_EXTORSION.join(", ")}.`;

export type ResultadoOido = { turnos: TurnoLlamada[]; usd: number; ms: number; via: "voice-transcribe" | "llm" };

/**
 * Escucha un trozo de la llamada y devuelve sus turnos.
 * Con Meta Model API usa Muse Voice Transcribe; con open weights, Muse Spark Open con el audio como entrada.
 */
export async function oirTrozo(
  wav: Uint8Array<ArrayBuffer>,
  o: { proveedor: ConfigProveedor; presupuesto: Presupuesto; contexto?: TurnoLlamada[]; fetchImpl?: typeof fetch },
): Promise<ResultadoOido> {
  const inicio = Date.now();
  if (o.proveedor.tieneVoz) {
    const t = await transcribirWav(wav, {
      proveedor: o.proveedor,
      presupuesto: o.presupuesto,
      modo: "ENDPOINTING",
      keywords: KEYWORDS_EXTORSION,
      fetchImpl: o.fetchImpl,
    });
    const turnos = t.turns.length > 0 ? t.turns.map((x) => x.transcript) : t.transcript ? [t.transcript] : [];
    return {
      turnos: turnos.filter((x) => x.trim()).map((texto) => ({ hablante: "desconocido", texto })),
      usd: t.usd,
      ms: Date.now() - inicio,
      via: "voice-transcribe",
    };
  }

  const b64 = aBase64(wav);
  const audio: ParteContenido =
    o.proveedor.formatoAudio === "audio_url"
      ? { type: "audio_url", audio_url: { url: `data:audio/wav;base64,${b64}` } }
      : { type: "input_audio", input_audio: { data: b64, format: "wav" } };
  const previo = (o.contexto ?? []).slice(-8).map((t) => `[${t.hablante}] ${t.texto}`).join("\n");

  const r = await chatJSON({
    proveedor: o.proveedor,
    modelo: o.proveedor.modelos.oido,
    mensajes: [
      { role: "system", content: INSTRUCCIONES },
      {
        role: "user",
        content: [
          ...(previo ? [{ type: "text" as const, text: `Contexto anterior de la llamada:\n${previo}` }] : []),
          audio,
          { type: "text", text: "Transcribe este fragmento." },
        ],
      },
    ],
    esquema: TranscripcionTrozo,
    nombreEsquema: "TranscripcionTrozo",
    presupuesto: o.presupuesto,
    esfuerzo: "low",
    tokensExtraEntrada: Math.ceil((duracionWavMs(wav) / 1000) * TOKENS_AUDIO_POR_SEGUNDO),
    maxTokensSalida: 2_000,
    timeoutMs: 45_000,
    fetchImpl: o.fetchImpl,
  });
  return {
    turnos: r.datos.turnos.filter((t) => t.texto.trim()),
    usd: r.usd,
    ms: Date.now() - inicio,
    via: "llm",
  };
}
