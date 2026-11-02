import { Presupuesto, PresupuestoAnidado } from "./budget";
import type { Llamada } from "./llamada";

/**
 * Almacén en memoria del proceso. Basta para un solo servidor Node (local o una instancia):
 * las llamadas duran minutos y no se guardan voces ni transcripciones en disco.
 */
type Global = typeof globalThis & {
  __cuelgaLlamadas?: Map<string, Llamada>;
  __cuelgaPresupuestos?: Map<string, Presupuesto>;
  __cuelgaGastoTotal?: Presupuesto;
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
  return nueva;
}

export function todas(): Llamada[] {
  return [...mapa().values()];
}
