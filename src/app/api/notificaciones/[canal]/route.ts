import { z } from "zod";
import { ConfigLlamada, ID_PROTEGIDO, ID_RESPALDO } from "@/lib/llamada";
import { guardarSuscripcion, suscripcion } from "@/lib/store";
import { Suscripcion } from "@/lib/suscripcion";

const Canal = ConfigLlamada.shape.canal;
const Alta = z.object({ contacto: z.enum([ID_PROTEGIDO, ID_RESPALDO]), suscripcion: Suscripcion });

/** La pantalla de casa copia las suscripciones a su configuración, para que sobrevivan a un reinicio del servidor. */
export async function GET(_req: Request, ctx: RouteContext<"/api/notificaciones/[canal]">) {
  const { canal } = await ctx.params;
  if (!Canal.safeParse(canal).success) return Response.json({ error: "Canal inválido" }, { status: 400 });
  return Response.json({ protegido: suscripcion(canal, ID_PROTEGIDO) ?? null, respaldo: suscripcion(canal, ID_RESPALDO) ?? null });
}

/** El teléfono del familiar se suscribe, y vuelve a mandar su suscripción cada vez que abre su página. */
export async function POST(req: Request, ctx: RouteContext<"/api/notificaciones/[canal]">) {
  const { canal } = await ctx.params;
  const a = Alta.safeParse(await req.json().catch(() => null));
  if (!Canal.safeParse(canal).success || !a.success) return Response.json({ error: "Suscripción inválida" }, { status: 400 });
  guardarSuscripcion(canal, a.data.contacto, a.data.suscripcion);
  return Response.json({ ok: true });
}
