import type { Etapa, Nivel } from "./stages";

export type Contacto = { id: string; nombre: string };

export type ConfigPolitica = {
  /** Personas a quienes el extorsionador podría decir que «tiene». Se les verifica en silencio. */
  protegidos: Contacto[];
  /** Segundo contacto que puede confirmar dónde está el protegido (pareja, escuela, trabajo). */
  respaldo: Contacto[];
  /** Cuánto esperar una respuesta antes de escalar. */
  esperaMs: number;
};

export type Fase =
  | "escuchando"
  | "atencion"
  | "verificando"
  | "segundo_contacto"
  | "sin_respuesta"
  | "a_salvo"
  | "pidio_ayuda";

export type Evento =
  | { tipo: "turno"; t: number; nivel: Nivel; etapa: Etapa; evidencia: string }
  | { tipo: "respuesta"; t: number; contactoId: string; estaBien: boolean }
  | { tipo: "tick"; t: number };

export type ClaveMensaje =
  | "atencion"
  | "alerta"
  | "a_salvo"
  | "sin_respuesta_primero"
  | "sin_respuesta_final"
  | "pidio_ayuda";

export type Accion =
  | { tipo: "enviar_verificacion"; contactoId: string; pregunta: "esta_bien" | "donde_esta" }
  | { tipo: "mostrar"; clave: ClaveMensaje; texto: string }
  | { tipo: "mostrar_numero"; numero: "089" | "911" };

export type Estado = {
  fase: Fase;
  nivel: Nivel;
  etapas: Etapa[];
  /** Momento en que se mandó la verificación que se está esperando. */
  esperandoDesde: number | null;
  enviados: string[];
  confirmadoPor: string | null;
  /** Línea de tiempo para el expediente. */
  bitacora: { t: number; nota: string }[];
};

export function estadoInicial(): Estado {
  return { fase: "escuchando", nivel: 0, etapas: [], esperandoDesde: null, enviados: [], confirmadoPor: null, bitacora: [] };
}

/**
 * Catálogo cerrado de lo que ve la víctima. El modelo nunca redacta estos mensajes,
 * así que Cuelga no puede aconsejar pagar ni negociar.
 */
export function mensaje(clave: ClaveMensaje, nombre = "tu familiar", respaldo = "otro contacto"): string {
  switch (clave) {
    case "atencion":
      return "Escuchando. No des nombres, direcciones ni datos de tu familia.";
    case "alerta":
      return `Esto parece secuestro virtual. No des datos ni deposites. Estamos verificando a ${nombre} en silencio.`;
    case "a_salvo":
      return `${nombre} ESTÁ A SALVO. CUELGA.`;
    case "sin_respuesta_primero":
      return `${nombre} aún no contesta. Preguntamos a ${respaldo}. No deposites ni des datos.`;
    case "sin_respuesta_final":
      return "Nadie ha confirmado todavía. Cuelga y llama al 089 (denuncia anónima). No deposites.";
    case "pidio_ayuda":
      return `${nombre} dice que NO está bien. Llama al 911 ahora.`;
  }
}

const TERMINALES: ReadonlySet<Fase> = new Set(["a_salvo", "pidio_ayuda"]);

export function reducir(
  cfg: ConfigPolitica,
  estado: Estado,
  evento: Evento,
): { estado: Estado; acciones: Accion[] } {
  const s: Estado = { ...estado, etapas: [...estado.etapas], enviados: [...estado.enviados], bitacora: [...estado.bitacora] };
  const acciones: Accion[] = [];
  const protegido = cfg.protegidos[0];
  const nombre = protegido?.nombre;
  const nombreRespaldo = cfg.respaldo[0]?.nombre;

  const mostrar = (clave: ClaveMensaje) => acciones.push({ tipo: "mostrar", clave, texto: mensaje(clave, nombre, nombreRespaldo) });
  const enviar = (contactos: Contacto[], pregunta: "esta_bien" | "donde_esta", t: number) => {
    for (const c of contactos) {
      if (s.enviados.includes(c.id)) continue;
      s.enviados.push(c.id);
      acciones.push({ tipo: "enviar_verificacion", contactoId: c.id, pregunta });
      s.bitacora.push({ t, nota: `Verificación enviada a ${c.nombre}` });
    }
    s.esperandoDesde = t;
  };

  if (TERMINALES.has(s.fase)) return { estado: s, acciones };

  switch (evento.tipo) {
    case "turno": {
      if (evento.etapa !== "ninguna" && !s.etapas.includes(evento.etapa)) {
        s.etapas.push(evento.etapa);
        s.bitacora.push({ t: evento.t, nota: `Etapa detectada: ${evento.etapa} («${evento.evidencia}»)` });
      }
      // El nivel nunca baja durante una llamada.
      if (evento.nivel > s.nivel) s.nivel = evento.nivel;

      if (s.nivel >= 2 && (s.fase === "escuchando" || s.fase === "atencion")) {
        s.fase = "verificando";
        enviar(cfg.protegidos, "esta_bien", evento.t);
        mostrar("alerta");
      } else if (s.nivel === 1 && s.fase === "escuchando") {
        s.fase = "atencion";
        mostrar("atencion");
      }
      break;
    }
    case "respuesta": {
      const esProtegido = cfg.protegidos.some((c) => c.id === evento.contactoId);
      const esRespaldo = cfg.respaldo.some((c) => c.id === evento.contactoId);
      if (!esProtegido && !esRespaldo) break;
      if (!s.enviados.includes(evento.contactoId)) break;
      if (!evento.estaBien) {
        s.fase = "pidio_ayuda";
        mostrar("pidio_ayuda");
        acciones.push({ tipo: "mostrar_numero", numero: "911" });
        s.bitacora.push({ t: evento.t, nota: `Respuesta: NO está bien (${evento.contactoId})` });
        break;
      }
      s.fase = "a_salvo";
      s.confirmadoPor = evento.contactoId;
      s.esperandoDesde = null;
      mostrar("a_salvo");
      s.bitacora.push({ t: evento.t, nota: `Confirmado a salvo por ${evento.contactoId}` });
      break;
    }
    case "tick": {
      if (s.esperandoDesde === null || evento.t - s.esperandoDesde < cfg.esperaMs) break;
      if (s.fase === "verificando") {
        if (cfg.respaldo.length > 0) {
          s.fase = "segundo_contacto";
          enviar(cfg.respaldo, "donde_esta", evento.t);
          mostrar("sin_respuesta_primero");
        } else {
          s.fase = "sin_respuesta";
          s.esperandoDesde = null;
          mostrar("sin_respuesta_final");
          acciones.push({ tipo: "mostrar_numero", numero: "089" });
        }
      } else if (s.fase === "segundo_contacto") {
        s.fase = "sin_respuesta";
        s.esperandoDesde = null;
        mostrar("sin_respuesta_final");
        acciones.push({ tipo: "mostrar_numero", numero: "089" });
      }
      break;
    }
  }
  return { estado: s, acciones };
}
