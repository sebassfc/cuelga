import { Presupuesto, PresupuestoAnidado } from "./budget";
import { ID_PROTEGIDO, type IdContacto, type Llamada, type Pregunta } from "./llamada";
import { enviarNotificacion, notificacionDe } from "./notificaciones";
import type { Suscripcion } from "./suscripcion";

/**
 * Almacén en memoria del proceso. Basta para un solo servidor Node (local o una instancia):
 * las llamadas duran minutos y no se guardan voces ni transcripciones en disco.
 */
type Global = typeof globalThis & {
  __cuelgaLlamadas?: Map<string, Llamada>;
  __cuelgaPresupuestos?: Map<string, Presupuesto>;
  __cuelgaGastoTotal?: Presupuesto;
  __cuelgaSuscripciones?: Map<string, Suscripcion>;
};
const g = globalThis as Global;

const VIDA_MS = 3 * 60 * 60_000;

function mapa() {
  g.__cuelgaLlamadas ??= new Map();
  return g.__cuelgaLlamadas;
}

function tope(variable: string, porDefecto: number) {
  const n = Number(process.env[variable]);
  return n > 0 ? n : porDefecto;
}

export function gastoTotal(): Presupuesto {
  g.__cuelgaGastoTotal ??= new Presupuesto(tope("CUELGA_MAX_USD_TOTAL", 20));
  return g.__cuelgaGastoTotal;
}

/** Presupuesto de una llamada: tope por llamada que también descuenta del tope total. */
export function presupuestoDe(id: string): Presupuesto {
  g.__cuelgaPresupuestos ??= new Map();
  let p = g.__cuelgaPresupuestos.get(id);
  if (!p) {
    p = new PresupuestoAnidado(tope("CUELGA_MAX_USD_PER_SESSION", 0.5), gastoTotal());
    g.__cuelgaPresupuestos.set(id, p);
  }
  return p;
}

export function obtener(id: string): Llamada | undefined {
  return mapa().get(id);
}

export function guardar(ll: Llamada) {
  const m = mapa();
  m.set(ll.id, ll);
  for (const [id, x] of m) {
    if (ll.creada - x.creada > VIDA_MS) {
      m.delete(id);
      g.__cuelgaPresupuestos?.delete(id);
    }
  }
}

/** Lee, transforma y guarda sin ningún `await` de por medio, para no pisar cambios concurrentes. */
export function actualizar(id: string, f: (ll: Llamada) => Llamada): Llamada | undefined {
  const ll = obtener(id);
  if (!ll) return undefined;
  const nueva = f(ll);
  mapa().set(id, nueva);
  // Cada verificación nueva también sale como notificación push, por si el familiar tiene su página cerrada.
  for (const p of nueva.preguntas.slice(ll.preguntas.length)) void notificar(nueva, p);
  return nueva;
}

async function notificar(ll: Llamada, p: Pregunta) {
  const { canal } = ll.config;
  const s = suscripcion(canal, p.contactoId) ?? ll.config.suscripciones?.[p.contactoId];
  if (!s) return;
  const r = await enviarNotificacion(s, notificacionDe(ll, p));
  if (r === "enviada") return;
  if (r === "vencida") guardarSuscripcion(canal, p.contactoId, null);
  const nombre = p.contactoId === ID_PROTEGIDO ? ll.config.protegido : ll.config.respaldo;
  actualizar(ll.id, (x) => ({ ...x, avisos: [...x.avisos, `No le llegó la notificación a ${nombre}. Solo lo verá si tiene su página abierta.`] }));
}

// --- suscripciones push de los familiares, por canal y contacto ---

const MAX_SUSCRIPCIONES = 5_000;

function suscripciones() {
  g.__cuelgaSuscripciones ??= new Map();
  return g.__cuelgaSuscripciones;
}

export function suscripcion(canal: string, contacto: IdContacto): Suscripcion | undefined {
  return suscripciones().get(`${canal}/${contacto}`);
}

export function guardarSuscripcion(canal: string, contacto: IdContacto, s: Suscripcion | null) {
  const m = suscripciones();
  const clave = `${canal}/${contacto}`;
  // Borrar y volver a insertar deja las más recientes al final; al pasar el tope se olvidan las más viejas.
  m.delete(clave);
  if (s) m.set(clave, s);
  for (const k of m.keys()) {
    if (m.size <= MAX_SUSCRIPCIONES) break;
    m.delete(k);
  }
}

export function todas(): Llamada[] {
  return [...mapa().values()];
}
