/**
 * Prueba de humo de 5 minutos. No imprime la key.
 *   pnpm humo                      → acceso (lista de modelos) + una clasificación en español
 *   pnpm humo audio/prueba.wav     → además escucha el WAV en trozos de 6 s (Voice Transcribe con meta; Muse Spark Open con open weights)
 *
 * Convierte cualquier audio a WAV válido con:
 *   ffmpeg -i entrada.m4a -ac 1 -ar 24000 -c:a pcm_s16le -map_metadata -1 audio/prueba.wav
 */
import { readFile } from "node:fs/promises";
import { Presupuesto } from "../src/lib/budget";
import { clasificarTurno, type TurnoLlamada } from "../src/lib/classifier";
import { ErrorApi, listarModelos } from "../src/lib/llm/client";
import { proveedorDesdeEnv } from "../src/lib/llm/provider";
import { oirTrozo } from "../src/lib/audio/oido";
import { cortarWav, duracionWavMs } from "../src/lib/audio/wav";
import { MODELO_VOZ } from "../src/lib/meta/voz";

const presupuesto = new Presupuesto(0.25);
const paso = (n: number, t: string) => console.log(`\n[${n}] ${t}`);

function explicar(e: unknown): string {
  if (e instanceof ErrorApi) {
    if (e.status === 401) return "401: la key no es válida o no es de este proveedor.";
    if (e.status === 403) return "403: la cuenta no tiene acceso (país, edad o billing). Revisa dev.meta.ai.";
    if (e.status === 402) return "402: falta método de pago o crédito.";
    if (e.status === 429) return "429: límite de tasa; espera un minuto.";
  }
  return e instanceof Error ? e.message : String(e);
}

const proveedor = proveedorDesdeEnv();
console.log(`Proveedor: ${proveedor.id} · ${proveedor.baseURL} · clasificador ${proveedor.modelos.clasificador} · oído ${proveedor.tieneVoz ? MODELO_VOZ : proveedor.modelos.oido}`);
let fallas = 0;

paso(1, "Acceso: GET /models");
try {
  const ids = await listarModelos(proveedor);
  console.log(`OK, ${ids.length} modelos. Muse: ${ids.filter((i) => /muse|sam|glimmer/i.test(i)).join(", ") || "(ninguno con ese nombre)"}`);
  if (!ids.includes(proveedor.modelos.clasificador)) {
    console.log(`AVISO: "${proveedor.modelos.clasificador}" no está en la lista. Ajusta CUELGA_MODELO_CLASIFICADOR.`);
  }
  if (proveedor.tieneVoz && !ids.includes(MODELO_VOZ)) console.log(`AVISO: "${MODELO_VOZ}" no está en la lista.`);
  if (!proveedor.tieneVoz && !ids.includes(proveedor.modelos.oido)) {
    console.log(`AVISO: "${proveedor.modelos.oido}" no está en la lista. Ajusta CUELGA_MODELO_OIDO.`);
  }
} catch (e) {
  fallas++;
  console.log(`FALLA: ${explicar(e)}`);
}

paso(2, "Clasificación de un turno en español");
const c = await clasificarTurno({
  historial: [{ hablante: "B", texto: "¡Abuelita, ayúdame!" }],
  turno: { hablante: "B", texto: "Señora, no cuelgue. Habla el comandante y tenemos a su nieta." },
  etapasPrevias: ["gancho"],
  proveedor,
  presupuesto,
});
if (c.errorModelo) {
  fallas++;
  console.log(`FALLA del modelo: ${c.errorModelo}`);
} else {
  console.log(`OK en ${c.ms} ms, $${c.usd.toFixed(5)}: etapa=${c.etapa} nivel=${c.nivel} fuente=${c.fuente}`);
  console.log(`   modelo → etapa=${c.modelo?.etapa} riesgo=${c.modelo?.riesgo} cita="${c.modelo?.evidencia}" verificada=${c.modelo?.citaVerificada}`);
}

const wav = process.argv[2];
if (wav) {
  paso(3, `Oído: ${wav} en trozos de 6 s`);
  try {
    const completo = new Uint8Array(await readFile(wav));
    console.log(`   ${(duracionWavMs(completo) / 1000).toFixed(1)} s de audio`);
    const contexto: TurnoLlamada[] = [];
    for (const trozo of cortarWav(completo, 6_000).slice(0, 5)) {
      const r = await oirTrozo(trozo.wav, { proveedor, presupuesto, contexto });
      console.log(`   [${(trozo.inicioMs / 1000).toFixed(0)}s] ${r.ms} ms, $${r.usd.toFixed(5)} vía ${r.via}`);
      for (const t of r.turnos) console.log(`      ${t.hablante}: ${t.texto}`);
      contexto.push(...r.turnos);
    }
  } catch (e) {
    fallas++;
    console.log(`FALLA: ${explicar(e)}`);
  }
}

console.log(`\nGasto de la prueba: $${presupuesto.gastado.toFixed(5)} · ${fallas === 0 ? "TODO OK" : `${fallas} falla(s)`}`);
process.exit(fallas === 0 ? 0 : 1);
