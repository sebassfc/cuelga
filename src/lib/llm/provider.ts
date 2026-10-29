import { z } from "zod";

/**
 * Cuelga funciona con dos rutas:
 * - "meta": Meta Model API (Muse Spark + Muse Voice Transcribe). Requiere cuenta en dev.meta.ai.
 * - "baseten" / "openrouter": open weights de Meta (Muse Spark Open, Muse Glimmer) sin cuenta de Meta.
 * Los IDs de modelo de los proveedores de open weights se confirman con `pnpm humo`.
 */
export const PROVEEDORES = {
  meta: {
    baseURL: "https://api.meta.ai/v1",
    variableKey: "MODEL_API_KEY",
    modelos: { clasificador: "muse-spark-1.3", agente: "muse-spark-1.3", oido: "muse-spark-1.2" },
    tieneVoz: true,
    jsonSchemaNativo: true,
    formatoAudio: "input_audio",
  },
  // La guía del hackathon pedía `-1026`, pero el GET /models de Baseten (29-oct) solo lista `meta-models/muse-spark-open`.
  baseten: {
    baseURL: "https://inference.baseten.co/v1",
    variableKey: "BASETEN_API_KEY",
    modelos: {
      clasificador: "meta-models/muse-spark-open",
      agente: "meta-models/muse-spark-open",
      oido: "meta-models/muse-spark-open",
    },
    tieneVoz: false,
    jsonSchemaNativo: false,
    formatoAudio: "audio_url",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    variableKey: "OPENROUTER_API_KEY",
    modelos: { clasificador: "meta/muse-spark-open", agente: "meta/muse-spark-open", oido: "meta/muse-spark-open" },
    tieneVoz: false,
    jsonSchemaNativo: false,
    formatoAudio: "input_audio",
  },
} as const;

export type IdProveedor = keyof typeof PROVEEDORES;

export type ConfigProveedor = {
  id: IdProveedor;
  baseURL: string;
  apiKey: string;
  /** clasificador: etapa por turno · agente: decisiones · oido: transcribir audio con el LLM (open weights). */
  modelos: { clasificador: string; agente: string; oido: string };
  tieneVoz: boolean;
  jsonSchemaNativo: boolean;
  formatoAudio: "audio_url" | "input_audio";
};

const EnvSchema = z.object({
  // Por defecto, open weights: la cuenta de Meta Model API está bloqueada (ver HACKATHON.md).
  CUELGA_PROVEEDOR: z.enum(["meta", "baseten", "openrouter"]).default("baseten"),
  CUELGA_BASE_URL: z.url().optional(),
  CUELGA_MODELO_CLASIFICADOR: z.string().min(1).optional(),
  CUELGA_MODELO_AGENTE: z.string().min(1).optional(),
  CUELGA_MODELO_OIDO: z.string().min(1).optional(),
});

/** Lee la configuración del entorno. Nunca devuelve ni imprime el valor de la key en errores. */
export function proveedorDesdeEnv(env: Record<string, string | undefined> = process.env): ConfigProveedor {
  const e = EnvSchema.parse(env);
  const base = PROVEEDORES[e.CUELGA_PROVEEDOR];
  const apiKey = env[base.variableKey];
  if (!apiKey) throw new Error(`Falta ${base.variableKey} en .env.local (proveedor ${e.CUELGA_PROVEEDOR})`);
  return {
    id: e.CUELGA_PROVEEDOR,
    baseURL: e.CUELGA_BASE_URL ?? base.baseURL,
    apiKey,
    modelos: {
      clasificador: e.CUELGA_MODELO_CLASIFICADOR ?? base.modelos.clasificador,
      agente: e.CUELGA_MODELO_AGENTE ?? base.modelos.agente,
      oido: e.CUELGA_MODELO_OIDO ?? base.modelos.oido,
    },
    tieneVoz: base.tieneVoz,
    jsonSchemaNativo: base.jsonSchemaNativo,
    formatoAudio: base.formatoAudio,
  };
}
