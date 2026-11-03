import { createECDH } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { combinar } from "./classifier";
import { agregarTurno, ConfigLlamada, nuevaLlamada, type Llamada } from "./llamada";
import { escanearLexico } from "./stages";
import { Suscripcion } from "./suscripcion";

const enviar = vi.hoisted(() => vi.fn());
vi.mock("./notificaciones", async (original) => ({ ...(await original<typeof import("./notificaciones")>()), enviarNotificacion: enviar }));

const { clavesVapid, notificacionDe } = await import("./notificaciones");
const { actualizar, guardar, guardarSuscripcion, suscripcion } = await import("./store");

const config: ConfigLlamada = { canal: "canal-de-prueba-123456", quienEscucha: "Abuela Mari", protegido: "Ana", respaldo: "Lucía", esperaSeg: 30 };
const sus: Suscripcion = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } };

function decir(ll: Llamada, texto: string, t: number) {
  return agregarTurno(ll, { hablante: "llamante", texto }, combinar(ll.estado.etapas, escanearLexico(texto), null), t, true);
}

const dejarCorrer = () => new Promise((r) => setTimeout(r, 0));

describe("notificaciones", () => {
  beforeEach(() => {
    enviar.mockReset();
    guardarSuscripcion(config.canal, "protegido", null);
    delete (globalThis as { __cuelgaVapid?: unknown }).__cuelgaVapid;
  });

  it("las llaves VAPID salen del secreto: mismas llaves en cada arranque, y válidas para P-256", () => {
    vi.stubEnv("CUELGA_PUSH_SECRETO", "secreto-de-prueba");
    const a = clavesVapid();
    delete (globalThis as { __cuelgaVapid?: unknown }).__cuelgaVapid;
    const b = clavesVapid();
    vi.unstubAllEnvs();
    expect(b).toEqual(a);
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(a.privada, "base64url"));
    expect(ecdh.getPublicKey().toString("base64url")).toBe(a.publica);
    expect(Buffer.from(a.publica, "base64url")).toHaveLength(65);
  });

  it("solo acepta servicios de push de navegadores: el servidor no le hace POST a cualquier URL", () => {
    for (const endpoint of ["https://fcm.googleapis.com/fcm/send/x", "https://web.push.apple.com/abc", "https://updates.push.services.mozilla.com/wpush/v2/x"]) {
      expect(Suscripcion.safeParse({ ...sus, endpoint }).success, endpoint).toBe(true);
    }
    for (const endpoint of ["http://fcm.googleapis.com/x", "https://169.254.169.254/latest", "https://fcm.googleapis.com.evil.mx/x", "https://fcm.googleapis.com:8443/x", "https://localhost/x"]) {
      expect(Suscripcion.safeParse({ ...sus, endpoint }).success, endpoint).toBe(false);
    }
  });

  it("una suscripción inválida en la configuración se descarta sin tumbar la llamada", () => {
    const r = ConfigLlamada.safeParse({ ...config, suscripciones: { protegido: { endpoint: "https://evil.mx/x", keys: sus.keys }, respaldo: sus } });
    expect(r.success).toBe(true);
    expect(r.data?.suscripciones?.protegido).toBeUndefined();
    expect(r.data?.suscripciones?.respaldo).toEqual(sus);
  });

  it("el texto sale del catálogo cerrado y apunta a la página y la API de ese familiar", () => {
    let ll = nuevaLlamada("11111111-1111-4111-8111-111111111111", config, 0);
    ll = decir(ll, "¡Abuelita, ayúdame, por favor!", 1_000);
    ll = decir(ll, "Señora, no cuelgue y no le diga a nadie.", 9_000);
    const n = notificacionDe(ll, ll.preguntas[0]);
    expect(n).toMatchObject({ titulo: "¿Estás bien?", si: "Sí, estoy bien", listo: "Listo. Ya le avisamos a Abuela Mari que estás bien." });
    expect(n.url).toBe("/familiar/canal-de-prueba-123456/protegido?n=Ana&de=Abuela+Mari");
    expect(n.api).toBe("/api/familiar/canal-de-prueba-123456/protegido");
    expect(JSON.stringify(n)).not.toMatch(/deposit|pag|transfier|negoci/i);
  });

  it("cada pregunta nueva sale una sola vez como notificación; si la suscripción venció, se borra y casa se entera", async () => {
    guardarSuscripcion(config.canal, "protegido", sus);
    enviar.mockResolvedValue("vencida");
    const id = "22222222-2222-4222-8222-222222222222";
    guardar(decir(nuevaLlamada(id, config, 0), "¡Abuelita, ayúdame, por favor!", 1_000));
    actualizar(id, (ll) => decir(ll, "Señora, no cuelgue y no le diga a nadie.", 9_000));
    actualizar(id, (ll) => decir(ll, "Habla el comandante.", 12_000));
    await dejarCorrer();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][0]).toEqual(sus);
    expect(suscripcion(config.canal, "protegido")).toBeUndefined();
    const avisos = actualizar(id, (ll) => ll)?.avisos ?? [];
    expect(avisos.at(-1)).toContain("No le llegó la notificación a Ana");
  });

  it("sin suscripción en el servidor usa la copia que mandó la pantalla de casa", async () => {
    enviar.mockResolvedValue("enviada");
    const id = "33333333-3333-4333-8333-333333333333";
    guardar(decir(nuevaLlamada(id, { ...config, suscripciones: { protegido: sus } }, 0), "¡Abuelita, ayúdame, por favor!", 1_000));
    actualizar(id, (ll) => decir(ll, "Señora, no cuelgue y no le diga a nadie.", 9_000));
    await dejarCorrer();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(actualizar(id, (ll) => ll)?.avisos).toEqual([]);
  });
});
