import type { IdContacto } from "../llamada";

/**
 * Notificaciones push en el teléfono del familiar. En iPhone solo existen si Cuelga está en la pantalla
 * de inicio (iOS 16.4 o más nuevo); en Android funcionan desde el navegador.
 */
export type Soporte = "si" | "instalar" | "no";

export function soporte(): Soporte {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "si";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "instalar" : "no";
}

function bytes(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function mismaClave(s: PushSubscription, clave: Uint8Array) {
  const actual = s.options.applicationServerKey;
  if (!actual) return false;
  const a = new Uint8Array(actual);
  return a.length === clave.length && a.every((x, i) => x === clave[i]);
}

/** Suscribe este navegador (con el permiso ya dado) y se lo dice al servidor. */
export async function suscribir(canal: string, contacto: IdContacto): Promise<boolean> {
  try {
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const r = await fetch("/api/notificaciones/clave", { cache: "no-store" });
    const clave = bytes(((await r.json()) as { clave: string }).clave);
    let s = await reg.pushManager.getSubscription();
    // Si el servidor cambió de llaves, la suscripción vieja ya no sirve.
    if (s && !mismaClave(s, clave)) {
      await s.unsubscribe();
      s = null;
    }
    s ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave });
    const alta = await fetch(`/api/notificaciones/${encodeURIComponent(canal)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contacto, suscripcion: s.toJSON() }),
    });
    return alta.ok;
  } catch {
    return false;
  }
}

/** Pide permiso y suscribe. Llamarla directo desde el toque: el navegador solo pide permiso tras un gesto. */
export async function activarNotificaciones(canal: string, contacto: IdContacto): Promise<"activas" | "bloqueadas" | "error"> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueadas" : "error";
  return (await suscribir(canal, contacto)) ? "activas" : "error";
}

/** Quita la notificación de una pregunta que ya se contestó en la página. */
export async function cerrarNotificaciones(llamadaId: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    for (const n of (await reg?.getNotifications()) ?? []) if (n.tag.startsWith(`cuelga-${llamadaId}`)) n.close();
  } catch {
    // sin service worker no hay nada que cerrar
  }
}
