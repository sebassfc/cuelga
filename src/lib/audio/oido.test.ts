import { describe, expect, it } from "vitest";
import { Presupuesto } from "../budget";
import type { ConfigProveedor } from "../llm/provider";
import { oirTrozo } from "./oido";
import { armarWav } from "./wav";

const wav = armarWav({ sampleRate: 24_000, canales: 1, bitsPorMuestra: 16 }, new Uint8Array(24_000 * 2 * 3));

const baseten: ConfigProveedor = {
  id: "baseten",
  baseURL: "https://inference.ejemplo.test/v1",
  apiKey: "falsa",
  modelos: { clasificador: "m", agente: "m", oido: "meta-models/muse-spark-open-1026" },
  tieneVoz: false,
  jsonSchemaNativo: false,
  formatoAudio: "audio_url",
};

function fetchEspia(respuesta: unknown) {
  const llamadas: { url: string; cuerpo: Record<string, unknown> }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, cuerpo: JSON.parse(String(init.body)) });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(respuesta) } }], usage: { prompt_tokens: 400, completion_tokens: 120 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  return { f, llamadas };
}

describe("oirTrozo con open weights", () => {
  it("manda el audio como audio_url en base64 y devuelve los turnos con hablante", async () => {
    const { f, llamadas } = fetchEspia({
      turnos: [
        { hablante: "llamante", texto: "No cuelgue, señora." },
        { hablante: "receptor", texto: "  " },
      ],
    });
    const r = await oirTrozo(wav, {
      proveedor: baseten,
      presupuesto: new Presupuesto(1),
      contexto: [{ hablante: "llamante", texto: "¡Abuelita, ayúdame!" }],
      fetchImpl: f,
    });
    expect(r.via).toBe("llm");
    expect(r.turnos).toEqual([{ hablante: "llamante", texto: "No cuelgue, señora." }]);

    const cuerpo = llamadas[0].cuerpo as { model: string; reasoning_effort: string; messages: { content: unknown }[] };
    expect(llamadas[0].url).toBe("https://inference.ejemplo.test/v1/chat/completions");
    expect(cuerpo.model).toBe("meta-models/muse-spark-open-1026");
    expect(cuerpo.reasoning_effort).toBe("low");
    const partes = cuerpo.messages[1].content as { type: string; audio_url?: { url: string }; text?: string }[];
    expect(partes[0].text).toContain("Abuelita");
    expect(partes[1].audio_url?.url.startsWith("data:audio/wav;base64,UklGR")).toBe(true);
  });

  it("usa input_audio cuando el proveedor lo pide", async () => {
    const { f, llamadas } = fetchEspia({ turnos: [] });
    await oirTrozo(wav, { proveedor: { ...baseten, formatoAudio: "input_audio" }, presupuesto: new Presupuesto(1), fetchImpl: f });
    const partes = (llamadas[0].cuerpo as { messages: { content: { type: string }[] }[] }).messages[1].content;
    expect(partes.map((p) => p.type)).toEqual(["input_audio", "text"]);
  });

  it("respeta el tope de gasto antes de mandar el audio", async () => {
    const { f, llamadas } = fetchEspia({ turnos: [] });
    await expect(oirTrozo(wav, { proveedor: baseten, presupuesto: new Presupuesto(0.0001), fetchImpl: f })).rejects.toThrow(/Tope de gasto/);
    expect(llamadas).toHaveLength(0);
  });
});
