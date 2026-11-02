import { after } from "next/server";
import { leerWav, duracionWavMs } from "@/lib/audio/wav";
import { escucharTrozo, proveedorOpcional, revisarConModelo } from "@/lib/escucha";
import { vistaEscucha } from "@/lib/llamada";
import { obtener } from "@/lib/store";

const MAX_BYTES = 2_000_000;
const MAX_MS = 20_000;

/** Un trozo de la llamada en WAV PCM. Responde cuando ya está transcrito; el modelo revisa las etapas después. */
export async function POST(req: Request, ctx: RouteContext<"/api/llamadas/[id]/audio">) {
  const { id } = await ctx.params;
  if (!obtener(id)) return Response.json({ error: "No existe esa llamada" }, { status: 404 });
  const proveedor = proveedorOpcional();
  if (!proveedor) return Response.json({ error: "El servidor no tiene modelo configurado para escuchar audio" }, { status: 503 });

  const wav = new Uint8Array(await req.arrayBuffer());
  if (wav.byteLength > MAX_BYTES) return Response.json({ error: "Trozo demasiado grande" }, { status: 413 });
  try {
    leerWav(wav);
    if (duracionWavMs(wav) > MAX_MS) return Response.json({ error: "Trozo de más de 20 s" }, { status: 413 });
  } catch {
    return Response.json({ error: "Se espera un WAV PCM" }, { status: 415 });
  }

  const indices = await escucharTrozo(id, wav, proveedor);
  after(() => revisarConModelo(id, indices, proveedor));
  const ll = obtener(id);
  return ll ? Response.json(vistaEscucha(ll, Date.now())) : Response.json({ error: "No existe esa llamada" }, { status: 404 });
}
