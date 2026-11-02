import { describe, expect, it } from "vitest";
import { Presupuesto, PresupuestoAnidado, TopeExcedido } from "./budget";
import { combinar } from "./classifier";
import { aplicar, agregarTurno, mejorarTurno, nuevaLlamada, responder, terminar, vistaEscucha, vistaFamiliar, type ConfigLlamada, type Llamada } from "./llamada";
import { escanearLexico } from "./stages";

const config: ConfigLlamada = { canal: "canal-de-prueba-123456", quienEscucha: "Abuela Mari", protegido: "Ana", respaldo: "Lucía", esperaSeg: 30 };

function decir(ll: Llamada, texto: string, t: number, hablante = "llamante") {
  return agregarTurno(ll, { hablante, texto }, combinar(ll.estado.etapas, escanearLexico(texto), null), t, true);
}

describe("llamada", () => {
  it("de la primera frase a «a salvo»: pregunta al familiar, guarda tiempos y libera la pregunta", () => {
    let ll = nuevaLlamada("11111111-1111-4111-8111-111111111111", config, 0);
    ll = decir(ll, "¡Abuelita, ayúdame, por favor!", 1_000);
    expect(ll.estado.fase).toBe("atencion");
    ll = decir(ll, "Señora, no cuelgue y no le diga a nadie.", 9_000);
    expect(ll.estado.fase).toBe("verificando");
    expect(ll.preguntas).toEqual([{ contactoId: "protegido", pregunta: "esta_bien", enviada: 9_000, respondida: null, estaBien: null }]);

    const f = vistaFamiliar([ll], config.canal, "protegido", 12_000);
    expect(f?.texto.titulo).toBe("¿Estás bien?");
    expect(f?.texto.detalle).toContain("Abuela Mari");
    expect(vistaFamiliar([ll], "otro-canal-0000000000", "protegido", 12_000)).toBeNull();

    ll = responder(ll, "protegido", true, 21_000);
    const v = vistaEscucha(ll, 30_000);
    expect(v.fase).toBe("a_salvo");
    expect(v.mensaje?.texto).toBe("Ana ESTÁ A SALVO. CUELGA.");
    expect(v.segAlerta).toBe(8);
    expect(v.segASalvo).toBe(20);
    expect(vistaFamiliar([ll], config.canal, "protegido", 22_000)).toBeNull();
  });

  it("nadie contesta: el tick pregunta al respaldo y luego muestra el 089", () => {
    let ll = decir(nuevaLlamada("22222222-2222-4222-8222-222222222222", config, 0), "Habla el comandante, no cuelgue.", 0);
    ll = aplicar(ll, { tipo: "tick", t: 29_000 });
    expect(vistaEscucha(ll, 29_000).escalaEnSeg).toBe(1);
    ll = aplicar(ll, { tipo: "tick", t: 30_000 });
    expect(ll.estado.fase).toBe("segundo_contacto");
    expect(vistaFamiliar([ll], config.canal, "respaldo", 31_000)?.texto.noSe).toBe("No sé");
    ll = aplicar(ll, { tipo: "tick", t: 60_000 });
    expect(ll.numero).toBe("089");
    expect(ll.mensaje?.clave).toBe("sin_respuesta_final");
  });

  it("el modelo puede subir un turno que el léxico no vio, pero llegar tarde no baja la alerta", () => {
    let ll = decir(nuevaLlamada("33333333-3333-4333-8333-333333333333", config, 0), "Oiga, ¿usted es la señora de la casa?", 0);
    expect(ll.estado.nivel).toBe(0);
    ll = mejorarTurno(ll, 0, { etapa: "autoridad", nivel: 2, evidencia: "señora de la casa", fuente: "modelo" }, 2_000);
    expect(ll.estado.fase).toBe("verificando");
    expect(ll.turnos[0].fuente).toBe("modelo");
    ll = mejorarTurno(ll, 0, { etapa: "ninguna", nivel: 0, evidencia: "", fuente: "lexico" }, 3_000);
    expect(ll.estado.nivel).toBe(2);
  });

  it("una llamada terminada no acepta turnos nuevos, pero sí la respuesta tardía del familiar", () => {
    let ll = decir(nuevaLlamada("44444444-4444-4444-8444-444444444444", config, 0), "No cuelgue.", 0);
    ll = terminar(ll, 5_000);
    expect(decir(ll, "Deposite en OXXO.", 6_000).turnos).toHaveLength(1);
    expect(vistaFamiliar([ll], config.canal, "protegido", 5_000 + 9 * 60_000)).not.toBeNull();
    expect(vistaFamiliar([ll], config.canal, "protegido", 5_000 + 11 * 60_000)).toBeNull();
    expect(responder(ll, "protegido", true, 7_000).estado.fase).toBe("a_salvo");
  });

  it("colgar a media verificación no la detiene: sigue al respaldo y al 089", () => {
    let ll = terminar(decir(nuevaLlamada("66666666-6666-4666-8666-666666666666", config, 0), "No cuelgue.", 0), 10_000);
    ll = aplicar(ll, { tipo: "tick", t: 30_000 });
    expect(ll.estado.fase).toBe("segundo_contacto");
    ll = aplicar(ll, { tipo: "tick", t: 60_000 });
    expect(ll.numero).toBe("089");
  });

  it("si el familiar dice que no está bien, se muestra el 911", () => {
    const ll = responder(decir(nuevaLlamada("55555555-5555-4555-8555-555555555555", config, 0), "No cuelgue.", 0), "protegido", false, 4_000);
    expect(ll.numero).toBe("911");
    expect(ll.estado.fase).toBe("pidio_ayuda");
  });
});

describe("PresupuestoAnidado", () => {
  it("rechaza si se pasa el tope de la llamada o el total, y registra en ambos", () => {
    const total = new Presupuesto(0.1);
    const a = new PresupuestoAnidado(0.05, total);
    const b = new PresupuestoAnidado(0.08, total);
    expect(() => a.reservar(0.06)).toThrow(TopeExcedido);
    a.registrar("x", 0.04);
    expect(total.gastado).toBeCloseTo(0.04);
    expect(() => b.reservar(0.07)).toThrow(TopeExcedido);
    const liberar = b.reservar(0.05);
    liberar();
    expect(() => b.reservar(0.05)).not.toThrow();
  });
});
