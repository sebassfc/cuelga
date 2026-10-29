/**
 * Evalúa el clasificador sobre los guiones sintéticos de data/guiones.
 *   pnpm eval            → solo léxico (gratis, sin red)
 *   pnpm eval --modelo   → léxico + modelo (cuesta; respeta CUELGA_MAX_USD_TOTAL)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Presupuesto } from "../src/lib/budget";
import { clasificarTurno, type TurnoLlamada } from "../src/lib/classifier";
import { proveedorDesdeEnv } from "../src/lib/llm/provider";
import { ETAPAS, type Etapa } from "../src/lib/stages";

const Guion = z.object({
  id: z.string(),
  tipo: z.enum(["secuestro_virtual", "benigna"]),
  sintetico: z.literal(true),
  descripcion: z.string(),
  turnos: z.array(z.object({ hablante: z.string(), texto: z.string(), etapa: z.enum(ETAPAS) })).min(1),
});

const conModelo = process.argv.includes("--modelo");
const dir = path.join(import.meta.dirname, "..", "data", "guiones");
const presupuesto = new Presupuesto(Number(process.env.CUELGA_MAX_USD_TOTAL ?? "2"));
const proveedor = conModelo ? proveedorDesdeEnv() : null;

type Fila = { id: string; tipo: string; turnos: number; aciertosEtapa: number; turnoAlerta: number | null; usd: number; errores: number };
const filas: Fila[] = [];

for (const archivo of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
  const g = Guion.parse(JSON.parse(await readFile(path.join(dir, archivo), "utf8")));
  const historial: TurnoLlamada[] = [];
  const etapas: Etapa[] = [];
  const fila: Fila = { id: g.id, tipo: g.tipo, turnos: g.turnos.length, aciertosEtapa: 0, turnoAlerta: null, usd: 0, errores: 0 };

  for (const [i, t] of g.turnos.entries()) {
    const turno = { hablante: t.hablante, texto: t.texto };
    const c = await clasificarTurno({ historial, turno, etapasPrevias: etapas, proveedor, presupuesto });
    if (c.etapa === t.etapa) fila.aciertosEtapa++;
    if (c.etapa !== "ninguna" && !etapas.includes(c.etapa)) etapas.push(c.etapa);
    if (c.nivel === 2 && fila.turnoAlerta === null) fila.turnoAlerta = i + 1;
    if (c.errorModelo) fila.errores++;
    fila.usd += c.usd;
    historial.push(turno);
  }
  filas.push(fila);
}

const sv = filas.filter((f) => f.tipo === "secuestro_virtual");
const bn = filas.filter((f) => f.tipo === "benigna");
const totalTurnos = filas.reduce((n, f) => n + f.turnos, 0);
const resumen = {
  modo: conModelo ? `léxico + modelo (${proveedor?.id}:${proveedor?.modelos.clasificador})` : "solo léxico",
  guiones: filas.length,
  exactitudEtapaPorTurno: filas.reduce((n, f) => n + f.aciertosEtapa, 0) / totalTurnos,
  secuestrosDetectados: `${sv.filter((f) => f.turnoAlerta !== null).length}/${sv.length}`,
  turnoPromedioDeAlerta: sv.filter((f) => f.turnoAlerta).reduce((n, f) => n + (f.turnoAlerta ?? 0), 0) / Math.max(1, sv.filter((f) => f.turnoAlerta).length),
  falsasAlarmas: `${bn.filter((f) => f.turnoAlerta !== null).length}/${bn.length}`,
  usd: Number(presupuesto.gastado.toFixed(4)),
  erroresDelModelo: filas.reduce((n, f) => n + f.errores, 0),
};

console.table(filas);
console.log(resumen);
await writeFile(
  path.join(import.meta.dirname, "..", "data", conModelo ? "eval-modelo.json" : "eval-lexico.json"),
  JSON.stringify({ resumen, filas }, null, 2) + "\n",
);
