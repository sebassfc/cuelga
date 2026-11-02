import { after } from "next/server";
import { z } from "zod";
import { agregarConLexico, proveedorOpcional, revisarConModelo } from "@/lib/escucha";
import { vistaEscucha } from "@/lib/llamada";
import { obtener } from "@/lib/store";

const Turno = z.object({
  hablante: z.enum(["llamante", "receptor", "desconocido"]),
  texto: z.string().trim().min(1).max(600),
});

/** Modo guion: un turno ya escrito, sin audio. Sirve para la demo sin micrófono y para probar sin gastar en el oído. */
export async function POST(req: Request, ctx: RouteContext<"/api/llamadas/[id]/turno">) {
  const { id } = await ctx.params;
  if (!obtener(id)) return Response.json({ error: "No existe esa llamada" }, { status: 404 });
  const turno = Turno.safeParse(await req.json().catch(() => null));
  if (!turno.success) return Response.json({ error: "Turno inválido" }, { status: 400 });

  const indices = agregarConLexico(id, [turno.data], Date.now());
  const proveedor = proveedorOpcional();
  if (proveedor) after(() => revisarConModelo(id, indices, proveedor));
  const ll = obtener(id);
  return ll ? Response.json(vistaEscucha(ll, Date.now())) : Response.json({ error: "No existe esa llamada" }, { status: 404 });
}
