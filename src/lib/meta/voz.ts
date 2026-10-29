import { z } from "zod";
import { duracionWavMs } from "../audio/wav";
import { costoVoz, type Presupuesto } from "../budget";
import { ErrorApi } from "../llm/client";
import type { ConfigProveedor } from "../llm/provider";

export const MODELO_VOZ = "muse-voice-transcribe-1.0";

export const Turno = z.object({
  turnId: z.number(),
  startMs: z.number(),
  endMs: z.number(),
  transcript: z.string(),
  speaker: z.string().optional(),
});
export type Turno = z.infer<typeof Turno>;

const RespuestaTranscripcion = z.object({
  sessionId: z.string(),
  transcript: z.string(),
  audioDurationMs: z.number(),
  turns: z.array(Turno).default([]),
});
export type Transcripcion = z.infer<typeof RespuestaTranscripcion>;

export type OpcionesVoz = {
  proveedor: ConfigProveedor;
  presupuesto: Presupuesto;
  /** ENDPOINTING para detectar etapas por turno; DIARIZATION para el expediente con hablantes. */
  modo: "ENDPOINTING" | "DIARIZATION" | "PUSH_TO_TALK";
  keywords?: string[];
  fetchImpl?: typeof fetch;
};

/** POST /v1/asr/transcribe: WAV mono PCM16 a 16 o 24 kHz, máximo 10 minutos. Solo existe en Meta Model API. */
export async function transcribirWav(wav: Uint8Array<ArrayBuffer>, o: OpcionesVoz): Promise<Transcripcion & { usd: number }> {
  if (!o.proveedor.tieneVoz) throw new Error(`El proveedor ${o.proveedor.id} no tiene Muse Voice Transcribe`);
  const ms = duracionWavMs(wav);
  if (ms > 10 * 60_000) throw new Error("El audio pasa de 10 minutos: córtalo en clips");
  const liberar = o.presupuesto.reservar(costoVoz(ms) + 0.001);
  try {
    const form = new FormData();
    const request = {
      model: MODELO_VOZ,
      audioEncoding: "WAV",
      mode: o.modo,
      languageBias: ["Spanish", "English"],
      ...(o.keywords?.length ? { keywords: o.keywords } : {}),
    };
    form.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
    form.append("audio", new Blob([wav], { type: "audio/wav" }), "llamada.wav");

    const res = await (o.fetchImpl ?? fetch)(`${o.proveedor.baseURL}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${o.proveedor.apiKey}`, Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const texto = await res.text();
    if (!res.ok) throw new ErrorApi(res.status, null, texto.slice(0, 300) || "(sin cuerpo)");
    const t = RespuestaTranscripcion.parse(JSON.parse(texto));
    const usd = costoVoz(t.audioDurationMs);
    o.presupuesto.registrar(`voz:${o.modo}`, usd);
    return { ...t, usd };
  } finally {
    liberar();
  }
}

/** Palabras que ayudan al reconocimiento en llamadas de extorsión en México. */
export const KEYWORDS_EXTORSION = ["no cuelgue", "comandante", "OXXO", "depósito", "transferencia", "CLABE", "rescate", "089"];
