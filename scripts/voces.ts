/**
 * Audio de prueba SINTÉTICO: convierte los guiones de `data/guiones/` en llamadas WAV con voces de ElevenLabs.
 * Sirve para medir el oído con voces creíbles y como ejemplo rotulado para los jueces. La app nunca lo usa.
 * No imprime la key.
 *   pnpm voces                → los 8 guiones a audio/sintetica-elevenlabs-<id>.wav
 *   pnpm voces sv-01 bn-02    → solo esos
 * Sin ELEVENLABS_API_KEY solo cuenta los caracteres que gastaría.
 *
 * Voces: ELEVENLABS_VOZ_LLAMANTE y ELEVENLABS_VOZ_RECEPTOR (IDs). Si faltan, toma la primera voz
 * masculina y la primera femenina de la cuenta.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { armarWav } from "../src/lib/audio/wav";

const API = "https://api.elevenlabs.io/v1";
const MODELO = "eleven_multilingual_v2";
const HZ = 16_000;
const PAUSA_MS = 700;

type Turno = { hablante: "llamante" | "victima"; texto: string };
type Guion = { id: string; sintetico: boolean; turnos: Turno[] };
type Voz = { voice_id: string; name: string; labels?: { gender?: string } };

const key = process.env.ELEVENLABS_API_KEY;
const pedidos = process.argv.slice(2);

const archivos = (await readdir("data/guiones")).filter((f) => f.endsWith(".json")).sort();
const guiones: Guion[] = [];
for (const f of archivos) {
  const g = JSON.parse(await readFile(`data/guiones/${f}`, "utf8")) as Guion;
  if (!g.sintetico) throw new Error(`${f} no está marcado como sintético`);
  if (pedidos.length === 0 || pedidos.includes(g.id)) guiones.push(g);
}
if (guiones.length === 0) throw new Error(`Ningún guion coincide con: ${pedidos.join(", ")}`);

const caracteres = guiones.reduce((n, g) => n + g.turnos.reduce((m, t) => m + t.texto.length, 0), 0);
console.log(`${guiones.length} guiones, ${caracteres} caracteres de ElevenLabs.`);

if (!key) {
  console.log("Falta ELEVENLABS_API_KEY en .env.local. Agrégala tú y vuelve a correr `pnpm voces`.");
  process.exit(1);
}

async function api(ruta: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(`${API}${ruta}`, { ...init, headers: { "xi-api-key": key!, "Content-Type": "application/json", ...init?.headers } });
  if (!r.ok) {
    const pista = r.status === 401 ? " (key inválida)" : r.status === 429 ? " (límite de tasa o de caracteres)" : "";
    throw new Error(`ElevenLabs ${r.status}${pista}: ${(await r.text()).slice(0, 200)}`);
  }
  return r;
}

async function elegirVoces(): Promise<Record<Turno["hablante"], Voz>> {
  const { voices } = (await (await api("/voices")).json()) as { voices: Voz[] };
  const porId = (id: string | undefined) => (id ? voices.find((v) => v.voice_id === id) : undefined);
  const porGenero = (g: string) => voices.find((v) => v.labels?.gender === g);
  const llamante = porId(process.env.ELEVENLABS_VOZ_LLAMANTE) ?? porGenero("male");
  const victima = porId(process.env.ELEVENLABS_VOZ_RECEPTOR) ?? porGenero("female");
  if (!llamante || !victima) throw new Error("No encontré una voz masculina y una femenina; define ELEVENLABS_VOZ_LLAMANTE y ELEVENLABS_VOZ_RECEPTOR.");
  return { llamante, victima };
}

async function decir(texto: string, voz: Voz): Promise<Uint8Array> {
  const r = await api(`/text-to-speech/${voz.voice_id}?output_format=pcm_${HZ}`, {
    method: "POST",
    body: JSON.stringify({ text: texto, model_id: MODELO }),
  });
  return new Uint8Array(await r.arrayBuffer());
}

const voces = await elegirVoces();
console.log(`Voces: llamante = ${voces.llamante.name}, en casa = ${voces.victima.name}`);
const silencio = new Uint8Array(Math.round((HZ * PAUSA_MS) / 1000) * 2);
await mkdir("audio", { recursive: true });

for (const g of guiones) {
  const partes: Uint8Array[] = [];
  for (const t of g.turnos) partes.push(await decir(t.texto, voces[t.hablante]), silencio);
  const pcm = new Uint8Array(partes.reduce((n, p) => n + p.byteLength, 0));
  let o = 0;
  for (const p of partes) {
    pcm.set(p, o);
    o += p.byteLength;
  }
  const destino = `audio/sintetica-elevenlabs-${g.id}.wav`;
  await writeFile(destino, armarWav({ sampleRate: HZ, canales: 1, bitsPorMuestra: 16 }, pcm));
  console.log(`${destino}: ${(pcm.byteLength / 2 / HZ).toFixed(1)} s`);
}
