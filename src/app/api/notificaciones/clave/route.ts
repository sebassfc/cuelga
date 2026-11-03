import { connection } from "next/server";
import { clavesVapid } from "@/lib/notificaciones";

/** Llave pública VAPID: el teléfono del familiar la necesita para suscribirse a las notificaciones. */
export async function GET() {
  await connection();
  return Response.json({ clave: clavesVapid().publica });
}
