import { aplicar, vistaEscucha } from "@/lib/llamada";
import { actualizar } from "@/lib/store";

/** La pantalla de casa pregunta cada segundo. Cada consulta es también el «tick» que hace escalar si nadie contesta. */
export async function GET(_req: Request, ctx: RouteContext<"/api/llamadas/[id]">) {
  const { id } = await ctx.params;
  const ahora = Date.now();
  const ll = actualizar(id, (x) => aplicar(x, { tipo: "tick", t: ahora }));
  if (!ll) return Response.json({ error: "No existe esa llamada" }, { status: 404 });
  return Response.json(vistaEscucha(ll, ahora));
}
