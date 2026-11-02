import { z } from "zod";
import { ID_PROTEGIDO, ID_RESPALDO, responder, vistaFamiliar, type IdContacto } from "@/lib/llamada";
import { actualizar, obtener, todas } from "@/lib/store";

const Contacto = z.enum([ID_PROTEGIDO, ID_RESPALDO]);
const Respuesta = z.object({ llamadaId: z.uuid(), estaBien: z.boolean() });

async function contactoDe(ctx: RouteContext<"/api/familiar/[canal]/[contacto]">): Promise<{ canal: string; contacto: IdContacto } | null> {
  const { canal, contacto } = await ctx.params;
  const c = Contacto.safeParse(contacto);
  return c.success ? { canal, contacto: c.data } : null;
}

/** El teléfono del familiar pregunta cada 2 s si alguien necesita saber que está bien. */
export async function GET(_req: Request, ctx: RouteContext<"/api/familiar/[canal]/[contacto]">) {
  const q = await contactoDe(ctx);
  if (!q) return Response.json({ error: "Contacto inválido" }, { status: 400 });
  return Response.json({ pregunta: vistaFamiliar(todas(), q.canal, q.contacto, Date.now()) });
}

/** La respuesta solo cuenta si la llamada es de este canal y le preguntó a este contacto (la política lo vuelve a revisar). */
export async function POST(req: Request, ctx: RouteContext<"/api/familiar/[canal]/[contacto]">) {
  const q = await contactoDe(ctx);
  const r = Respuesta.safeParse(await req.json().catch(() => null));
  if (!q || !r.success) return Response.json({ error: "Respuesta inválida" }, { status: 400 });
  if (obtener(r.data.llamadaId)?.config.canal !== q.canal) return Response.json({ error: "No existe esa llamada" }, { status: 404 });
  actualizar(r.data.llamadaId, (ll) => responder(ll, q.contacto, r.data.estaBien, Date.now()));
  return Response.json({ ok: true });
}
