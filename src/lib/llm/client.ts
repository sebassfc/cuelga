import { z } from "zod";
import { costoTokens, estimarTokens, type Presupuesto } from "../budget";
import type { ConfigProveedor } from "./provider";

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly tipo: string | null,
    mensaje: string,
  ) {
    super(`API ${status}${tipo ? ` (${tipo})` : ""}: ${mensaje}`);
    this.name = "ErrorApi";
  }
}

export type ParteContenido =
  | { type: "text"; text: string }
  | { type: "audio_url"; audio_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: "wav" } };

export type Mensaje = { role: "system" | "user" | "assistant"; content: string | ParteContenido[] };

function caracteresDe(m: Mensaje): number {
  if (typeof m.content === "string") return m.content.length;
  return m.content.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);
}

export type ResultadoJSON<T> = {
  datos: T;
  usd: number;
  ms: number;
  tokens: { entrada: number; salida: number };
  intentos: number;
};

const RespuestaChat = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).partial().optional(),
});

const ErrorEnvelope = z.object({ error: z.object({ type: z.string().nullable().optional(), message: z.string() }) });

export type OpcionesJSON<T> = {
  proveedor: ConfigProveedor;
  modelo: string;
  mensajes: Mensaje[];
  esquema: z.ZodType<T>;
  nombreEsquema: string;
  presupuesto: Presupuesto;
  maxTokensSalida?: number;
  esfuerzo?: "minimal" | "low" | "medium" | "high";
  /** Tokens de entrada que no son texto (audio, imagen), para reservar presupuesto. */
  tokensExtraEntrada?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function jsonSchemaDe(esquema: z.ZodType): Record<string, unknown> {
  const { $schema: _omitido, ...resto } = z.toJSONSchema(esquema) as Record<string, unknown>;
  return resto;
}

/** Quita cercas ```json``` si el modelo las agrega fuera del modo json_schema. */
function extraerJSON(texto: string): string {
  const cerca = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (cerca ? cerca[1] : texto).trim();
}

/**
 * Chat Completions con salida JSON validada por Zod.
 * Con json_schema nativo (Meta) la decodificación ya viene restringida; con open weights
 * se pide el JSON por instrucciones y se reintenta una vez con el error de validación.
 */
export async function chatJSON<T>(o: OpcionesJSON<T>): Promise<ResultadoJSON<T>> {
  const fetchImpl = o.fetchImpl ?? fetch;
  const maxSalida = o.maxTokensSalida ?? 2_000;
  const esquemaJSON = jsonSchemaDe(o.esquema);
  let mensajes = [...o.mensajes];
  if (!o.proveedor.jsonSchemaNativo) {
    mensajes = [
      ...mensajes,
      {
        role: "system",
        content: `Responde SOLO con un objeto JSON válido que cumpla este JSON Schema, sin texto extra:\n${JSON.stringify(esquemaJSON)}`,
      },
    ];
  }

  let usdTotal = 0;
  let entradaTotal = 0;
  let salidaTotal = 0;
  const inicio = Date.now();

  for (let intento = 1; intento <= 2; intento++) {
    const caracteres = mensajes.reduce((n, m) => n + caracteresDe(m), 0);
    const estimado = costoTokens(o.modelo, estimarTokens(caracteres) + (o.tokensExtraEntrada ?? 0) + 500, maxSalida);
    const liberar = o.presupuesto.reservar(estimado);
    try {
      const cuerpo: Record<string, unknown> = {
        model: o.modelo,
        messages: mensajes,
        max_completion_tokens: maxSalida,
      };
      if (o.esfuerzo) cuerpo.reasoning_effort = o.esfuerzo;
      if (o.proveedor.jsonSchemaNativo) {
        cuerpo.response_format = { type: "json_schema", json_schema: { name: o.nombreEsquema, schema: esquemaJSON } };
      }

      const res = await fetchImpl(`${o.proveedor.baseURL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${o.proveedor.apiKey}` },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
      });
      const texto = await res.text();
      if (!res.ok) {
        const env = ErrorEnvelope.safeParse(safeJSON(texto));
        throw new ErrorApi(res.status, env.success ? (env.data.error.type ?? null) : null, env.success ? env.data.error.message : texto.slice(0, 300) || "(sin cuerpo)");
      }

      const r = RespuestaChat.parse(JSON.parse(texto));
      const entrada = r.usage?.prompt_tokens ?? estimarTokens(caracteres) + (o.tokensExtraEntrada ?? 0);
      const salida = r.usage?.completion_tokens ?? maxSalida;
      const usd = costoTokens(o.modelo, entrada, salida);
      o.presupuesto.registrar(`${o.nombreEsquema}#${intento}`, usd);
      usdTotal += usd;
      entradaTotal += entrada;
      salidaTotal += salida;

      const contenido = r.choices[0].message.content ?? "";
      const validado = o.esquema.safeParse(safeJSON(extraerJSON(contenido)));
      if (validado.success) {
        return {
          datos: validado.data,
          usd: usdTotal,
          ms: Date.now() - inicio,
          tokens: { entrada: entradaTotal, salida: salidaTotal },
          intentos: intento,
        };
      }
      mensajes = [
        ...mensajes,
        { role: "assistant", content: contenido },
        { role: "user", content: `Tu JSON no es válido: ${z.prettifyError(validado.error)}. Corrígelo y responde solo el JSON.` },
      ];
    } finally {
      liberar();
    }
  }
  throw new Error(`El modelo no devolvió un JSON válido para ${o.nombreEsquema} en 2 intentos`);
}

function safeJSON(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** GET /models: la forma más barata de confirmar que la key y el país tienen acceso. */
export async function listarModelos(proveedor: ConfigProveedor, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${proveedor.baseURL}/models`, {
    headers: { Authorization: `Bearer ${proveedor.apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  const texto = await res.text();
  if (!res.ok) {
    const env = ErrorEnvelope.safeParse(safeJSON(texto));
    throw new ErrorApi(res.status, env.success ? (env.data.error.type ?? null) : null, env.success ? env.data.error.message : texto.slice(0, 300) || "(sin cuerpo)");
  }
  const datos = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(JSON.parse(texto));
  return datos.data.map((m) => m.id);
}
