import { createECDH, createHash } from "node:crypto";
import webpush from "web-push";
import { ID_PROTEGIDO, textoPregunta, type Llamada, type Pregunta } from "./llamada";
import type { Suscripcion } from "./suscripcion";

/**
 * Notificaciones push al teléfono del familiar: «¿Estás bien?» le llega aunque tenga la página cerrada
 * y el teléfono bloqueado. El texto sale del mismo catálogo cerrado que su página (`textoPregunta`).
 */

type Claves = { publica: string; privada: string };
const g = globalThis as typeof globalThis & { __cuelgaVapid?: Claves };

/**
 * Las llaves VAPID salen de `CUELGA_PUSH_SECRETO`, un valor aleatorio que genera Render: sobreviven a reinicios
 * y nadie tiene que copiarlas. Sin él (desarrollo) hay llaves nuevas en cada arranque.
 */
export function clavesVapid(): Claves {
  if (g.__cuelgaVapid) return g.__cuelgaVapid;
  const secreto = process.env.CUELGA_PUSH_SECRETO;
  if (secreto) {
    const privada = createHash("sha256").update(`cuelga-vapid-v1:${secreto}`).digest();
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(privada);
    g.__cuelgaVapid = { publica: ecdh.getPublicKey().toString("base64url"), privada: privada.toString("base64url") };
  } else {
    const k = webpush.generateVAPIDKeys();
    g.__cuelgaVapid = { publica: k.publicKey, privada: k.privateKey };
  }
  return g.__cuelgaVapid;
}

export type Notificacion = {
  titulo: string;
  detalle: string;
  si: string;
  listo: string;
  /** Página del familiar, que se abre al tocar la notificación. */
  url: string;
  /** Donde el botón «Sí» de la notificación manda la respuesta. */
  api: string;
  llamadaId: string;
  etiqueta: string;
};

export function notificacionDe(ll: Llamada, p: Pregunta): Notificacion {
  const { canal, quienEscucha, protegido, respaldo } = ll.config;
  const t = textoPregunta(p.pregunta, ll.config);
  const nombre = p.contactoId === ID_PROTEGIDO ? protegido : (respaldo ?? "");
  const ruta = `/familiar/${canal}/${p.contactoId}`;
  return {
    titulo: t.titulo,
    detalle: t.detalle,
    si: t.si,
    listo: t.listo,
    url: `${ruta}?${new URLSearchParams({ n: nombre, de: quienEscucha })}`,
    api: `/api${ruta}`,
    llamadaId: ll.id,
    etiqueta: `cuelga-${ll.id}-${p.contactoId}`,
  };
}

export type ResultadoEnvio = "enviada" | "vencida" | "fallo";

export async function enviarNotificacion(s: Suscripcion, n: Notificacion): Promise<ResultadoEnvio> {
  const k = clavesVapid();
  const inicio = Date.now();
  try {
    await webpush.sendNotification(s, JSON.stringify(n), {
      vapidDetails: { subject: process.env.RENDER_EXTERNAL_URL ?? "https://cuelga.onrender.com", publicKey: k.publica, privateKey: k.privada },
      // La pregunta sigue abierta 10 minutos después de colgar; urgencia alta para que Android no la retrase.
      TTL: 10 * 60,
      urgency: "high",
      timeout: 10_000,
    });
    console.info(`notificación enviada en ${Date.now() - inicio} ms`);
    return "enviada";
  } catch (e) {
    const codigo = (e as { statusCode?: number }).statusCode;
    console.warn(`notificación no enviada (${codigo ?? "sin respuesta"}) en ${Date.now() - inicio} ms`);
    // 404/410: el navegador ya no tiene esa suscripción; 403: se hizo con otras llaves.
    return codigo === 403 || codigo === 404 || codigo === 410 ? "vencida" : "fallo";
  }
}
