import { z } from "zod";
import type { Presupuesto } from "./budget";
import { chatJSON } from "./llm/client";
import type { ConfigProveedor } from "./llm/provider";
import { ETAPA_INFO, ETAPAS, escanearLexico, etapaMayor, nivelPorEtapas, normalizar, type Etapa, type Nivel, type ResultadoLexico } from "./stages";

export const ClasificacionModelo = z.object({
  etapa: z.enum(ETAPAS).describe("Etapa del guion de secuestro virtual que muestra ESTE turno"),
  riesgo: z.number().min(0).max(1).describe("Probabilidad de que la llamada completa sea secuestro virtual o extorsión"),
  evidencia: z.string().describe("Cita textual y exacta del turno que justifica la etapa; vacía si es «ninguna»"),
  datosQueSabe: z.array(z.string()).describe("Datos de la familia que el llamante ya mencionó"),
  datosQueSolto: z.array(z.string()).describe("Datos que la víctima reveló en este turno"),
});
export type ClasificacionModelo = z.infer<typeof ClasificacionModelo>;

export type TurnoLlamada = { hablante: string; texto: string };

export type Clasificacion = {
  etapa: Etapa;
  nivel: Nivel;
  evidencia: string;
  fuente: "lexico" | "modelo" | "ambos";
  lexico: ResultadoLexico;
  modelo: (ClasificacionModelo & { citaVerificada: boolean }) | null;
  errorModelo: string | null;
  usd: number;
  ms: number;
};

const SISTEMA = `Eres el clasificador de Cuelga, un escudo contra el secuestro virtual en México.
Lees una llamada turno por turno y marcas en qué etapa del guion de extorsión va el ÚLTIMO turno.
Etapas: ${ETAPAS.map((e) => `${e}: ${ETAPA_INFO[e].descripcion}`).join(" | ")}.
Reglas:
- La evidencia debe ser una cita EXACTA copiada del último turno. Si no hay, usa "" y etapa "ninguna".
- "riesgo" es sobre toda la llamada hasta ahora, de 0 a 1.
- Una llamada normal de familia, banco o trabajo es "ninguna" con riesgo bajo.
- Solo clasificas: no das consejos ni redactas mensajes.`;

/** La cita del modelo cuenta solo si aparece literalmente (normalizada) en el turno. */
export function citaEnTurno(evidencia: string, turno: string): boolean {
  const e = normalizar(evidencia);
  return e.length >= 3 && normalizar(turno).includes(e);
}

/**
 * Combina léxico y modelo. El léxico es el piso: el modelo puede subir la etapa,
 * pero solo si su cita está en el turno y su riesgo es alto. Si el modelo falla, queda el léxico.
 */
export function combinar(
  etapasPrevias: readonly Etapa[],
  lexico: ResultadoLexico,
  modelo: (ClasificacionModelo & { citaVerificada: boolean }) | null,
): Pick<Clasificacion, "etapa" | "nivel" | "evidencia" | "fuente"> {
  const usarModelo = modelo !== null && modelo.citaVerificada && modelo.etapa !== "ninguna" && modelo.riesgo >= 0.6;
  const candidatas: Etapa[] = [lexico.etapa];
  if (usarModelo) candidatas.push(modelo.etapa);
  const etapa = etapaMayor(candidatas);

  const vistas = new Set<Etapa>([...etapasPrevias, ...lexico.aciertos.map((a) => a.etapa)]);
  if (usarModelo) vistas.add(modelo.etapa);
  let nivel = nivelPorEtapas(vistas);
  if (modelo && modelo.citaVerificada && modelo.riesgo >= 0.85 && nivel < 2) nivel = 2;

  const deLexico = lexico.aciertos.find((a) => a.etapa === etapa)?.fragmento ?? "";
  const fuente = usarModelo && lexico.etapa !== "ninguna" ? "ambos" : usarModelo ? "modelo" : "lexico";
  return { etapa, nivel, evidencia: usarModelo && modelo.etapa === etapa ? modelo.evidencia : deLexico, fuente };
}

export async function clasificarTurno(o: {
  historial: TurnoLlamada[];
  turno: TurnoLlamada;
  etapasPrevias: readonly Etapa[];
  proveedor: ConfigProveedor | null;
  presupuesto: Presupuesto;
  fetchImpl?: typeof fetch;
}): Promise<Clasificacion> {
  const lexico = escanearLexico(o.turno.texto);
  let modelo: Clasificacion["modelo"] = null;
  let errorModelo: string | null = null;
  let usd = 0;
  let ms = 0;

  if (o.proveedor) {
    const conversacion = [...o.historial.slice(-12), o.turno].map((t) => `[${t.hablante}] ${t.texto}`).join("\n");
    try {
      const r = await chatJSON({
        proveedor: o.proveedor,
        modelo: o.proveedor.modelos.clasificador,
        mensajes: [
          { role: "system", content: SISTEMA },
          { role: "user", content: `Llamada hasta ahora:\n${conversacion}\n\nClasifica el último turno.` },
        ],
        esquema: ClasificacionModelo,
        nombreEsquema: "ClasificacionTurno",
        presupuesto: o.presupuesto,
        esfuerzo: "low",
        maxTokensSalida: 1_500,
        fetchImpl: o.fetchImpl,
      });
      modelo = { ...r.datos, citaVerificada: r.datos.etapa === "ninguna" || citaEnTurno(r.datos.evidencia, o.turno.texto) };
      usd = r.usd;
      ms = r.ms;
    } catch (e) {
      errorModelo = e instanceof Error ? e.message : String(e);
    }
  }

  return { ...combinar(o.etapasPrevias, lexico, modelo), lexico, modelo, errorModelo, usd, ms };
}
