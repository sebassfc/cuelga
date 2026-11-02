import { oirTrozo } from "./audio/oido";
import { TopeExcedido } from "./budget";
import { clasificarTurno, combinar, type TurnoLlamada } from "./classifier";
import { agregarTurno, mejorarTurno } from "./llamada";
import { proveedorDesdeEnv, type ConfigProveedor } from "./llm/provider";
import { escanearLexico } from "./stages";
import { actualizar, obtener, presupuestoDe } from "./store";

/** Sin key configurada Cuelga sigue funcionando con el léxico (modo guion), pero no puede escuchar audio. */
export function proveedorOpcional(): ConfigProveedor | null {
  try {
    return proveedorDesdeEnv();
  } catch {
    return null;
  }
}

/** Texto para la pantalla: nunca el mensaje crudo del proveedor. */
function aviso(e: unknown): string {
  // clasificarTurno devuelve el error como texto, así que también se reconoce por su mensaje.
  if (e instanceof TopeExcedido || (e instanceof Error && e.message.startsWith("Tope de gasto"))) {
    return "Se alcanzó el tope de gasto: sigue solo el léxico.";
  }
  return "El modelo no respondió a tiempo: sigue el léxico.";
}

function anotarError(id: string, donde: string, e: unknown) {
  console.warn(`[cuelga] ${donde}: ${e instanceof Error ? e.message : String(e)}`);
  actualizar(id, (ll) => ({ ...ll, avisos: [...ll.avisos, aviso(e)] }));
}

/**
 * Agrega turnos clasificados solo con el léxico, que es instantáneo, para que la alerta no espere al modelo.
 * Devuelve los índices de los turnos agregados para que el modelo los revise después.
 */
export function agregarConLexico(id: string, turnos: TurnoLlamada[], t: number): number[] {
  const indices: number[] = [];
  for (const turno of turnos) {
    actualizar(id, (ll) => {
      if (ll.tiempos.fin !== null) return ll;
      indices.push(ll.turnos.length);
      return agregarTurno(ll, turno, combinar(ll.estado.etapas, escanearLexico(turno.texto), null), t, true);
    });
  }
  return indices;
}

/** El modelo revisa los turnos en orden. Si falla o se acaba el presupuesto, se queda la clasificación del léxico. */
export async function revisarConModelo(id: string, indices: number[], proveedor: ConfigProveedor | null) {
  for (const i of indices) {
    const ll = obtener(id);
    const turno = ll?.turnos[i];
    if (!ll || !turno) continue;
    const c = await clasificarTurno({
      historial: ll.turnos.slice(0, i).map((x) => ({ hablante: x.hablante, texto: x.texto })),
      turno: { hablante: turno.hablante, texto: turno.texto },
      etapasPrevias: ll.estado.etapas,
      proveedor,
      presupuesto: presupuestoDe(id),
    });
    actualizar(id, (x) => ({ ...mejorarTurno(x, i, c, Date.now()), usd: x.usd + c.usd }));
    if (c.errorModelo) anotarError(id, `clasificar turno ${i}`, new Error(c.errorModelo));
  }
}

/** Escucha un trozo de audio: el modelo lo transcribe y cada turno entra con el léxico. */
export async function escucharTrozo(id: string, wav: Uint8Array<ArrayBuffer>, proveedor: ConfigProveedor): Promise<number[]> {
  const ll = obtener(id);
  if (!ll) return [];
  try {
    const r = await oirTrozo(wav, {
      proveedor,
      presupuesto: presupuestoDe(id),
      contexto: ll.turnos.slice(-8).map((x) => ({ hablante: x.hablante, texto: x.texto })),
    });
    actualizar(id, (x) => ({ ...x, usd: x.usd + r.usd }));
    return agregarConLexico(id, r.turnos, Date.now());
  } catch (e) {
    anotarError(id, "oír trozo", e);
    return [];
  }
}
