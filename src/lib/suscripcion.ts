import { z } from "zod";

/**
 * Suscripción push de un navegador, tal como la da `PushSubscription.toJSON()`.
 * El servidor le hace POST al `endpoint`, así que solo se aceptan los servicios de push de los navegadores.
 */
const SERVICIOS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function esServicioPush(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && !url.port && SERVICIOS.some((s) => s.test(url.hostname));
  } catch {
    return false;
  }
}

export const Suscripcion = z.object({
  endpoint: z.string().max(1024).refine(esServicioPush, "Servicio de push desconocido"),
  keys: z.object({ p256dh: z.string().max(200).regex(B64URL), auth: z.string().max(64).regex(B64URL) }),
});
export type Suscripcion = z.infer<typeof Suscripcion>;
