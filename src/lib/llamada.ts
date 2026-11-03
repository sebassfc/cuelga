import { z } from "zod";
import type { Clasificacion, TurnoLlamada } from "./classifier";
import { estadoInicial, reducir, type ClaveMensaje, type ConfigPolitica, type Estado, type Evento, type Fase } from "./policy";
import type { Etapa, Nivel } from "./stages";
import { Suscripcion } from "./suscripcion";

/**
 * Una llamada sospechosa en curso: lo que escucha el dispositivo de casa y lo que contestan los familiares.
 * Todo aquí es lógica pura sobre datos; el almacén y las rutas viven en store.ts y app/api.
 */

export const ID_PROTEGIDO = "protegido";
export const ID_RESPALDO = "respaldo";
export type IdContacto = typeof ID_PROTEGIDO | typeof ID_RESPALDO;

const Nombre = z.string().trim().min(1).max(40);

export const ConfigLlamada = z.object({
  /** Canal de la familia: un token aleatorio que también va en los enlaces de los familiares. */
  canal: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  /** Quién contesta en casa, como lo verán los familiares («Abuela Mari»). */
  quienEscucha: Nombre,
  protegido: Nombre,
  respaldo: Nombre.nullable(),
  esperaSeg: z.number().int().min(15).max(120),
  /**
   * Copia de las suscripciones push que guarda la pantalla de casa, por si el servidor se reinició desde
   * que el familiar activó sus notificaciones. Una suscripción inválida se descarta sin tumbar la llamada.
   */
  suscripciones: z
    .object({ protegido: Suscripcion.optional().catch(undefined), respaldo: Suscripcion.optional().catch(undefined) })
    .optional()
    .catch(undefined),
});
export type ConfigLlamada = z.infer<typeof ConfigLlamada>;

export type FuenteTurno = Clasificacion["fuente"] | "pendiente";

export type TurnoVista = {
  t: number;
  hablante: string;
  texto: string;
  etapa: Etapa;
  nivel: Nivel;
  fuente: FuenteTurno;
  evidencia: string;
};

export type Pregunta = {
  contactoId: IdContacto;
  pregunta: "esta_bien" | "donde_esta";
  enviada: number;
  respondida: number | null;
  estaBien: boolean | null;
};

export type Llamada = {
  id: string;
  config: ConfigLlamada;
  creada: number;
  estado: Estado;
  turnos: TurnoVista[];
  preguntas: Pregunta[];
  mensaje: { clave: ClaveMensaje; texto: string } | null;
  numero: "089" | "911" | null;
  tiempos: { primerTurno: number | null; alerta: number | null; aSalvo: number | null; fin: number | null };
  usd: number;
  avisos: string[];
};

export function configPolitica(c: ConfigLlamada): ConfigPolitica {
  return {
    protegidos: [{ id: ID_PROTEGIDO, nombre: c.protegido }],
    respaldo: c.respaldo ? [{ id: ID_RESPALDO, nombre: c.respaldo }] : [],
    esperaMs: c.esperaSeg * 1000,
  };
}

export function nuevaLlamada(id: string, config: ConfigLlamada, t: number): Llamada {
  return {
    id,
    config,
    creada: t,
    estado: estadoInicial(),
    turnos: [],
    preguntas: [],
    mensaje: null,
    numero: null,
    tiempos: { primerTurno: null, alerta: null, aSalvo: null, fin: null },
    usd: 0,
    avisos: [],
  };
}

/** Pasa un evento por la política y refleja sus acciones en la llamada. Devuelve una copia. */
export function aplicar(ll: Llamada, evento: Evento): Llamada {
  // Colgar no detiene la verificación: si nadie ha confirmado, se sigue escalando hasta el 089.
  if (ll.tiempos.fin !== null && evento.tipo === "turno") return ll;
  const { estado, acciones } = reducir(configPolitica(ll.config), ll.estado, evento);
  const out: Llamada = { ...ll, estado, preguntas: ll.preguntas.map((p) => ({ ...p })), tiempos: { ...ll.tiempos } };

  for (const a of acciones) {
    if (a.tipo === "enviar_verificacion") {
      out.preguntas.push({ contactoId: a.contactoId as IdContacto, pregunta: a.pregunta, enviada: evento.t, respondida: null, estaBien: null });
    } else if (a.tipo === "mostrar") {
      out.mensaje = { clave: a.clave, texto: a.texto };
    } else {
      out.numero = a.numero;
    }
  }
  if (evento.tipo === "respuesta") {
    const p = out.preguntas.find((x) => x.contactoId === evento.contactoId && x.respondida === null);
    if (p) {
      p.respondida = evento.t;
      p.estaBien = evento.estaBien;
    }
  }
  if (out.tiempos.alerta === null && ll.estado.fase !== "verificando" && estado.fase === "verificando") out.tiempos.alerta = evento.t;
  if (out.tiempos.aSalvo === null && estado.fase === "a_salvo") out.tiempos.aSalvo = evento.t;
  return out;
}

type Juicio = Pick<Clasificacion, "etapa" | "nivel" | "evidencia" | "fuente">;

/** Agrega un turno ya clasificado (normalmente solo con el léxico, que es instantáneo). */
export function agregarTurno(ll: Llamada, turno: TurnoLlamada, j: Juicio, t: number, pendiente: boolean): Llamada {
  if (ll.tiempos.fin !== null) return ll;
  const conTurno: Llamada = {
    ...ll,
    turnos: [...ll.turnos, { t, hablante: turno.hablante, texto: turno.texto, etapa: j.etapa, nivel: j.nivel, fuente: pendiente ? "pendiente" : j.fuente, evidencia: j.evidencia }],
    tiempos: { ...ll.tiempos, primerTurno: ll.tiempos.primerTurno ?? t },
  };
  return aplicar(conTurno, { tipo: "turno", t, nivel: j.nivel, etapa: j.etapa, evidencia: j.evidencia });
}

/**
 * Llega la opinión del modelo sobre un turno que ya se mostró. La política solo deja subir
 * el nivel, así que llegar tarde no puede bajar una alerta.
 */
export function mejorarTurno(ll: Llamada, indice: number, j: Juicio, t: number): Llamada {
  const previo = ll.turnos[indice];
  if (!previo) return ll;
  const turnos = ll.turnos.map((x, i) => (i === indice ? { ...x, etapa: j.etapa, nivel: j.nivel, fuente: j.fuente, evidencia: j.evidencia } : x));
  return aplicar({ ...ll, turnos }, { tipo: "turno", t, nivel: j.nivel, etapa: j.etapa, evidencia: j.evidencia });
}

export function responder(ll: Llamada, contactoId: IdContacto, estaBien: boolean, t: number): Llamada {
  return aplicar(ll, { tipo: "respuesta", t, contactoId, estaBien });
}

export function terminar(ll: Llamada, t: number): Llamada {
  return ll.tiempos.fin !== null ? ll : { ...ll, tiempos: { ...ll.tiempos, fin: t } };
}

// --- lo que ve cada pantalla ---

export type VistaEscucha = {
  id: string;
  fase: Fase;
  nivel: Nivel;
  etapas: Etapa[];
  mensaje: { clave: ClaveMensaje; texto: string } | null;
  numero: "089" | "911" | null;
  turnos: TurnoVista[];
  preguntas: { nombre: string; pregunta: Pregunta["pregunta"]; esperandoSeg: number | null; estaBien: boolean | null }[];
  /** Segundos que faltan para escalar al siguiente paso, mientras se espera respuesta. */
  escalaEnSeg: number | null;
  /** Desde el primer turno hasta la alerta y hasta «a salvo». */
  segAlerta: number | null;
  segASalvo: number | null;
  segLlamada: number | null;
  terminada: boolean;
  usd: number;
  avisos: string[];
};

const seg = (desde: number | null, hasta: number | null) => (desde === null || hasta === null ? null : Math.max(0, Math.round((hasta - desde) / 1000)));

export function vistaEscucha(ll: Llamada, ahora: number): VistaEscucha {
  const nombres: Record<IdContacto, string> = { protegido: ll.config.protegido, respaldo: ll.config.respaldo ?? "Respaldo" };
  const esperando = ll.estado.esperandoDesde;
  const fin = ll.tiempos.fin ?? ahora;
  return {
    id: ll.id,
    fase: ll.estado.fase,
    nivel: ll.estado.nivel,
    etapas: ll.estado.etapas,
    mensaje: ll.mensaje,
    numero: ll.numero,
    turnos: ll.turnos.slice(-40),
    preguntas: ll.preguntas.map((p) => ({
      nombre: nombres[p.contactoId],
      pregunta: p.pregunta,
      esperandoSeg: p.respondida === null ? seg(p.enviada, ahora) : null,
      estaBien: p.estaBien,
    })),
    escalaEnSeg: esperando === null ? null : Math.max(0, Math.ceil((esperando + ll.config.esperaSeg * 1000 - ahora) / 1000)),
    segAlerta: seg(ll.tiempos.primerTurno, ll.tiempos.alerta),
    segASalvo: seg(ll.tiempos.primerTurno, ll.tiempos.aSalvo),
    segLlamada: seg(ll.tiempos.primerTurno, ll.tiempos.primerTurno === null ? null : fin),
    terminada: ll.tiempos.fin !== null,
    usd: ll.usd,
    avisos: ll.avisos.slice(-3),
  };
}

/**
 * Catálogo cerrado de lo que ve el familiar. Como en `mensaje()`, el modelo nunca redacta este texto.
 */
export function textoPregunta(p: Pregunta["pregunta"], c: Pick<ConfigLlamada, "quienEscucha" | "protegido">) {
  if (p === "esta_bien") {
    return {
      titulo: "¿Estás bien?",
      detalle: `Alguien llamó a ${c.quienEscucha} diciendo que te tiene. Contesta aquí, sin llamarle: la llamada sigue.`,
      si: "Sí, estoy bien",
      no: "No, necesito ayuda",
      noSe: null,
      listo: `Listo. Ya le avisamos a ${c.quienEscucha} que estás bien.`,
    };
  }
  return {
    titulo: `¿Sabes si ${c.protegido} está bien?`,
    detalle: `Alguien llamó a ${c.quienEscucha} diciendo que tiene a ${c.protegido}, y ${c.protegido} no contesta.`,
    si: `Sí, ${c.protegido} está bien`,
    no: `No, ${c.protegido} no está bien`,
    noSe: "No sé",
    listo: `Listo. Ya le avisamos a ${c.quienEscucha} que ${c.protegido} está bien.`,
  };
}

export type VistaFamiliar = {
  llamadaId: string;
  pregunta: Pregunta["pregunta"];
  enviadaHaceSeg: number;
  texto: ReturnType<typeof textoPregunta>;
} | null;

/** La pregunta abierta para este contacto en la llamada más reciente del canal que lo esté esperando. */
export function vistaFamiliar(llamadas: Llamada[], canal: string, contactoId: IdContacto, ahora: number): VistaFamiliar {
  const candidatas = llamadas
    .filter((ll) => ll.config.canal === canal && ll.estado.fase !== "a_salvo" && ll.estado.fase !== "pidio_ayuda")
    // Si la llamada ya terminó sin respuesta, la pregunta sigue abierta 10 minutos más.
    .filter((ll) => ll.tiempos.fin === null || ahora - ll.tiempos.fin < 10 * 60_000)
    .flatMap((ll) => ll.preguntas.filter((p) => p.contactoId === contactoId && p.respondida === null).map((p) => ({ ll, p })))
    .sort((a, b) => b.p.enviada - a.p.enviada);
  const hit = candidatas[0];
  if (!hit) return null;
  return {
    llamadaId: hit.ll.id,
    pregunta: hit.p.pregunta,
    enviadaHaceSeg: Math.max(0, Math.round((ahora - hit.p.enviada) / 1000)),
    texto: textoPregunta(hit.p.pregunta, hit.ll.config),
  };
}
