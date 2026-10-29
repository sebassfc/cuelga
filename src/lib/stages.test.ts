import { describe, expect, it } from "vitest";
import { escanearLexico, etapaMayor, nivelPorEtapas, normalizar, type Etapa } from "./stages";

describe("normalizar", () => {
  it("quita acentos, signos y mayúsculas", () => {
    expect(normalizar("¡NO CUELGUE, señora! ¿Me oyó?")).toBe("no cuelgue senora me oyo");
  });
});

describe("escanearLexico", () => {
  const casos: [string, Etapa][] = [
    ["¡Mamá, ayúdame! ¡Me tienen!", "gancho"],
    ["¿No me reconoces? Soy tu sobrino", "gancho"],
    ["Usted no cuelgue y no le diga a nadie", "aislamiento"],
    ["Habla el comandante, sabemos dónde vive", "autoridad"],
    ["Queremos cincuenta mil pesos o le va a pasar algo", "exigencia"],
    ["Vaya al OXXO y deposite a esta tarjeta", "pago"],
    ["Hola ma, ya llegué a la casa, ¿qué hay de cenar?", "ninguna"],
  ];
  it.each(casos)("«%s» → %s", (texto, esperada) => {
    expect(escanearLexico(texto).etapa).toBe(esperada);
  });

  it("devuelve el fragmento que disparó cada etapa", () => {
    const r = escanearLexico("No cuelgue. Somos del cártel. Deposite en OXXO.");
    expect(r.aciertos.map((a) => a.etapa).sort()).toEqual(["aislamiento", "autoridad", "pago"]);
    expect(r.etapa).toBe("pago");
    for (const a of r.aciertos) expect(normalizar("No cuelgue. Somos del cártel. Deposite en OXXO.")).toContain(a.fragmento);
  });
});

describe("nivelPorEtapas", () => {
  it("0 sin señales", () => expect(nivelPorEtapas(new Set<Etapa>(["ninguna"]))).toBe(0));
  it("1 con solo gancho o solo pago (ambiguas)", () => {
    expect(nivelPorEtapas(new Set<Etapa>(["gancho"]))).toBe(1);
    expect(nivelPorEtapas(new Set<Etapa>(["pago"]))).toBe(1);
  });
  it("2 con una etapa de alerta", () => expect(nivelPorEtapas(new Set<Etapa>(["aislamiento"]))).toBe(2));
  it("2 con dos etapas distintas", () => expect(nivelPorEtapas(new Set<Etapa>(["gancho", "pago"]))).toBe(2));
});

describe("etapaMayor", () => {
  it("toma la de mayor orden", () => expect(etapaMayor(["gancho", "exigencia", "aislamiento"])).toBe("exigencia"));
  it("ninguna si está vacío", () => expect(etapaMayor([])).toBe("ninguna"));
});
