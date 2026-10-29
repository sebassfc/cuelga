import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { estadoInicial, mensaje, reducir, type Accion, type ConfigPolitica, type Evento, type ClaveMensaje } from "./policy";
import { ETAPAS } from "./stages";

const cfg: ConfigPolitica = {
  protegidos: [{ id: "nieta", nombre: "Ana" }],
  respaldo: [{ id: "mama", nombre: "Lucía" }],
  esperaMs: 60_000,
};

function correr(eventos: Evento[], c: ConfigPolitica = cfg) {
  let estado = estadoInicial();
  const acciones: Accion[] = [];
  for (const e of eventos) {
    const r = reducir(c, estado, e);
    estado = r.estado;
    acciones.push(...r.acciones);
  }
  return { estado, acciones };
}

const turno = (t: number, nivel: 0 | 1 | 2, etapa: (typeof ETAPAS)[number] = "aislamiento"): Evento => ({
  tipo: "turno",
  t,
  nivel,
  etapa,
  evidencia: "no cuelgue",
});

describe("reducir", () => {
  it("verifica en silencio al protegido cuando llega a nivel 2", () => {
    const { estado, acciones } = correr([turno(0, 1, "gancho"), turno(5_000, 2)]);
    expect(estado.fase).toBe("verificando");
    expect(acciones).toContainEqual({ tipo: "enviar_verificacion", contactoId: "nieta", pregunta: "esta_bien" });
  });

  it("declara a salvo cuando el protegido responde que está bien", () => {
    const { estado, acciones } = correr([
      turno(0, 2),
      { tipo: "respuesta", t: 20_000, contactoId: "nieta", estaBien: true },
    ]);
    expect(estado.fase).toBe("a_salvo");
    expect(acciones.at(-1)).toEqual({ tipo: "mostrar", clave: "a_salvo", texto: "Ana ESTÁ A SALVO. CUELGA." });
  });

  it("si nadie contesta: segundo contacto y después 089", () => {
    const { estado, acciones } = correr([
      turno(0, 2),
      { tipo: "tick", t: 59_000 },
      { tipo: "tick", t: 60_000 },
      { tipo: "tick", t: 120_000 },
    ]);
    expect(acciones).toContainEqual({ tipo: "enviar_verificacion", contactoId: "mama", pregunta: "donde_esta" });
    expect(acciones).toContainEqual({ tipo: "mostrar_numero", numero: "089" });
    expect(estado.fase).toBe("sin_respuesta");
  });

  it("sin respaldo configurado pasa directo al 089", () => {
    const { acciones } = correr([turno(0, 2), { tipo: "tick", t: 60_000 }], { ...cfg, respaldo: [] });
    expect(acciones).toContainEqual({ tipo: "mostrar_numero", numero: "089" });
  });

  it("si el protegido dice que NO está bien, manda al 911", () => {
    const { estado, acciones } = correr([turno(0, 2), { tipo: "respuesta", t: 1_000, contactoId: "nieta", estaBien: false }]);
    expect(estado.fase).toBe("pidio_ayuda");
    expect(acciones).toContainEqual({ tipo: "mostrar_numero", numero: "911" });
  });

  it("ignora respuestas de alguien a quien no se le preguntó", () => {
    const { estado } = correr([turno(0, 2), { tipo: "respuesta", t: 1_000, contactoId: "desconocido", estaBien: true }]);
    expect(estado.fase).toBe("verificando");
  });

  it("una respuesta antes de enviar la verificación no cuenta", () => {
    const { estado } = correr([{ tipo: "respuesta", t: 0, contactoId: "nieta", estaBien: true }, turno(1_000, 2)]);
    expect(estado.fase).toBe("verificando");
  });
});

describe("catálogo de mensajes", () => {
  const claves: ClaveMensaje[] = ["atencion", "alerta", "a_salvo", "sin_respuesta_primero", "sin_respuesta_final", "pidio_ayuda"];
  it("nunca aconseja pagar, depositar ni negociar", () => {
    for (const clave of claves) {
      const texto = mensaje(clave, "Ana", "Lucía").toLowerCase();
      for (const verbo of ["deposit", "pag", "transfier", "negoci"]) {
        // Solo puede aparecer negado: «no deposites», «ni deposites».
        const apariciones = texto.match(new RegExp(`\\S+ ${verbo}`, "g")) ?? [];
        for (const ap of apariciones) expect(ap).toMatch(new RegExp(`^(no|ni) ${verbo}`));
        if (texto.startsWith(verbo)) throw new Error(`«${clave}» empieza con ${verbo}`);
      }
    }
  });
});

const eventoArb: fc.Arbitrary<Evento> = fc.oneof(
  fc.record({
    tipo: fc.constant("turno" as const),
    t: fc.integer({ min: 0, max: 600_000 }),
    nivel: fc.constantFrom(0 as const, 1 as const, 2 as const),
    etapa: fc.constantFrom(...ETAPAS),
    evidencia: fc.string(),
  }),
  fc.record({
    tipo: fc.constant("respuesta" as const),
    t: fc.integer({ min: 0, max: 600_000 }),
    contactoId: fc.constantFrom("nieta", "mama", "otro"),
    estaBien: fc.boolean(),
  }),
  fc.record({ tipo: fc.constant("tick" as const), t: fc.integer({ min: 0, max: 600_000 }) }),
);

describe("propiedades", () => {
  it("cada contacto recibe a lo más una verificación y nada se envía tras confirmar", () => {
    fc.assert(
      fc.property(fc.array(eventoArb, { maxLength: 40 }), (eventos) => {
        let estado = estadoInicial();
        const enviados: string[] = [];
        for (const e of eventos) {
          const terminal = estado.fase === "a_salvo" || estado.fase === "pidio_ayuda";
          const r = reducir(cfg, estado, e);
          for (const a of r.acciones) {
            if (terminal) return false;
            if (a.tipo === "enviar_verificacion") {
              if (enviados.includes(a.contactoId)) return false;
              enviados.push(a.contactoId);
            }
          }
          estado = r.estado;
        }
        return true;
      }),
    );
  });

  it("el nivel nunca baja y «a salvo» solo llega por una respuesta afirmativa de alguien consultado", () => {
    fc.assert(
      fc.property(fc.array(eventoArb, { maxLength: 40 }), (eventos) => {
        let estado = estadoInicial();
        for (const e of eventos) {
          const antes = estado;
          estado = reducir(cfg, antes, e).estado;
          if (estado.nivel < antes.nivel) return false;
          if (antes.fase !== "a_salvo" && estado.fase === "a_salvo") {
            if (e.tipo !== "respuesta" || !e.estaBien || !antes.enviados.includes(e.contactoId)) return false;
          }
        }
        return true;
      }),
    );
  });
});
