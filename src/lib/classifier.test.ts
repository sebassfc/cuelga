import { describe, expect, it } from "vitest";
import { Presupuesto, TopeExcedido } from "./budget";
import { citaEnTurno, clasificarTurno, combinar, type ClasificacionModelo } from "./classifier";
import type { ConfigProveedor } from "./llm/provider";
import { escanearLexico } from "./stages";

const proveedorFalso: ConfigProveedor = {
  id: "meta",
  baseURL: "https://api.ejemplo.test/v1",
  apiKey: "LLM_falsa",
  modelos: { clasificador: "muse-spark-1.3", agente: "muse-spark-1.3", oido: "muse-spark-1.2" },
  tieneVoz: true,
  jsonSchemaNativo: true,
  formatoAudio: "input_audio",
};

function fetchQueResponde(contenido: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(
      status === 200
        ? JSON.stringify({
            choices: [{ message: { content: JSON.stringify(contenido) } }],
            usage: { prompt_tokens: 800, completion_tokens: 300 },
          })
        : JSON.stringify({ error: { type: "server_error", message: "falla" } }),
      { status },
    )) as typeof fetch;
}

const modelo = (m: Partial<ClasificacionModelo>): ClasificacionModelo => ({
  etapa: "ninguna",
  riesgo: 0,
  evidencia: "",
  datosQueSabe: [],
  datosQueSolto: [],
  ...m,
});

describe("citaEnTurno", () => {
  it("acepta la cita aunque cambien acentos y signos", () => {
    expect(citaEnTurno("no le diga a nadie", "¡Señora, NO le diga a nadie!")).toBe(true);
  });
  it("rechaza una cita inventada", () => {
    expect(citaEnTurno("deposite en OXXO", "Hola ma, ¿cómo estás?")).toBe(false);
  });
});

describe("combinar", () => {
  it("el léxico es el piso aunque el modelo diga «ninguna»", () => {
    const r = combinar([], escanearLexico("No cuelgue, señora"), { ...modelo({}), citaVerificada: true });
    expect(r).toMatchObject({ etapa: "aislamiento", nivel: 2, fuente: "lexico" });
  });

  it("el modelo sube la etapa solo con cita verificada y riesgo alto", () => {
    const lex = escanearLexico("Mire, usted me va a hacer caso o ya sabe");
    const conCita = combinar([], lex, { ...modelo({ etapa: "exigencia", riesgo: 0.8, evidencia: "me va a hacer caso" }), citaVerificada: true });
    expect(conCita).toMatchObject({ etapa: "exigencia", nivel: 2, fuente: "modelo" });
    const sinCita = combinar([], lex, { ...modelo({ etapa: "exigencia", riesgo: 0.8, evidencia: "inventado" }), citaVerificada: false });
    expect(sinCita).toMatchObject({ etapa: "ninguna", nivel: 0 });
  });

  it("acumula etapas de turnos previos", () => {
    const r = combinar(["gancho"], escanearLexico("Vaya al OXXO"), null);
    expect(r.nivel).toBe(2);
  });
});

describe("clasificarTurno", () => {
  const turno = { hablante: "B", texto: "No cuelgue, tenemos a su nieta" };

  it("usa el modelo cuando responde bien", async () => {
    const r = await clasificarTurno({
      historial: [],
      turno,
      etapasPrevias: [],
      proveedor: proveedorFalso,
      presupuesto: new Presupuesto(1),
      fetchImpl: fetchQueResponde(modelo({ etapa: "aislamiento", riesgo: 0.9, evidencia: "No cuelgue" })),
    });
    expect(r.modelo?.citaVerificada).toBe(true);
    expect(r.fuente).toBe("ambos");
    expect(r.nivel).toBe(2);
    expect(r.usd).toBeGreaterThan(0);
  });

  it("si el modelo falla, se queda con el léxico y reporta el error", async () => {
    const r = await clasificarTurno({
      historial: [],
      turno,
      etapasPrevias: [],
      proveedor: proveedorFalso,
      presupuesto: new Presupuesto(1),
      fetchImpl: fetchQueResponde(null, 500),
    });
    expect(r.modelo).toBeNull();
    expect(r.errorModelo).toMatch(/500/);
    expect(r.nivel).toBe(2);
  });

  it("sin presupuesto no llama al modelo y sigue con el léxico", async () => {
    const p = new Presupuesto(0.000001);
    const r = await clasificarTurno({ historial: [], turno, etapasPrevias: [], proveedor: proveedorFalso, presupuesto: p, fetchImpl: fetchQueResponde({}) });
    expect(r.errorModelo).toMatch(/Tope de gasto/);
    expect(r.nivel).toBe(2);
    expect(() => p.reservar(1)).toThrow(TopeExcedido);
  });
});
