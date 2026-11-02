import { ConfigLlamada, nuevaLlamada, vistaEscucha } from "@/lib/llamada";
import { proveedorOpcional } from "@/lib/escucha";
import { guardar } from "@/lib/store";

/** Empieza una llamada sospechosa. Devuelve la vista inicial y si hay modelo para escuchar audio. */
export async function POST(req: Request) {
  const config = ConfigLlamada.safeParse(await req.json().catch(() => null));
  if (!config.success) return Response.json({ error: "Configuración inválida" }, { status: 400 });
  const ahora = Date.now();
  const ll = nuevaLlamada(crypto.randomUUID(), config.data, ahora);
  guardar(ll);
  return Response.json({ vista: vistaEscucha(ll, ahora), puedeEscuchar: proveedorOpcional() !== null }, { status: 201 });
}
