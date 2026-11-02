import { terminar, vistaEscucha } from "@/lib/llamada";
import { actualizar } from "@/lib/store";

/** Quien contesta colgó. Las preguntas a los familiares siguen abiertas unos minutos por si contestan tarde. */
export async function POST(_req: Request, ctx: RouteContext<"/api/llamadas/[id]/fin">) {
  const { id } = await ctx.params;
  const ahora = Date.now();
  const ll = actualizar(id, (x) => terminar(x, ahora));
  if (!ll) return Response.json({ error: "No existe esa llamada" }, { status: 404 });
  return Response.json(vistaEscucha(ll, ahora));
}
