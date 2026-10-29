import { describe, expect, it } from "vitest";
import { costoTokens, costoVoz, Presupuesto, TopeExcedido } from "./budget";

describe("costos", () => {
  it("Spark 1.3: 20K de entrada + 3K de salida ≈ $0.03775", () => {
    expect(costoTokens("muse-spark-1.3", 20_000, 3_000)).toBeCloseTo(0.03775, 6);
  });
  it("modelo desconocido se cobra como Wonder (lado seguro)", () => {
    expect(costoTokens("modelo-raro", 1_000_000, 0)).toBe(4);
  });
  it("voz: 30.4 s se cobran como 30 s", () => {
    expect(costoVoz(30_400)).toBeCloseTo((30 / 3600) * 0.18, 10);
  });
});

describe("Presupuesto", () => {
  it("rechaza una llamada que rebasaría el tope", () => {
    const p = new Presupuesto(0.1);
    p.registrar("a", 0.08);
    expect(() => p.reservar(0.05)).toThrow(TopeExcedido);
  });

  it("las reservas abiertas cuentan contra el tope y se liberan una sola vez", () => {
    const p = new Presupuesto(0.1);
    const liberar = p.reservar(0.06);
    expect(() => p.reservar(0.06)).toThrow(TopeExcedido);
    liberar();
    liberar();
    expect(() => p.reservar(0.06)).not.toThrow();
  });
});
