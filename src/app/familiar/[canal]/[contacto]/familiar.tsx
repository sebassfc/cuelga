"use client";

import { use, useEffect, useRef, useState } from "react";
import { Marca } from "@/components/marca";
import { activarNotificaciones, cerrarNotificaciones, soporte, suscribir } from "@/lib/cliente/notificaciones";
import type { IdContacto, VistaFamiliar } from "@/lib/llamada";

type Respuesta = { estaBien: boolean } | { noSe: true };
type EstadoNotificaciones = "cargando" | "activas" | "apagadas" | "bloqueadas" | "instalar" | "no" | "error";

export function Familiar({ params, searchParams }: { params: Promise<{ canal: string; contacto: string }>; searchParams: Promise<{ n?: string; de?: string }> }) {
  const { canal, contacto } = use(params);
  const { n, de } = use(searchParams);
  return <Telefono canal={canal} contacto={contacto} nombre={n?.slice(0, 40) || "tú"} quien={de?.slice(0, 40) || "tu familia"} />;
}

/**
 * Teléfono del familiar: espera en silencio y solo suena cuando alguien necesita saber que está bien.
 * `enMarco` lo dibuja dentro del teléfono de la demo, sin sonido y sin ocupar toda la ventana.
 */
export function Telefono({ canal, contacto, nombre, quien, enMarco = false }: { canal: string; contacto: string; nombre: string; quien: string; enMarco?: boolean }) {
  const api = `/api/familiar/${encodeURIComponent(canal)}/${encodeURIComponent(contacto)}`;

  const [pregunta, setPregunta] = useState<NonNullable<VistaFamiliar> | null>(null);
  const [respondida, setRespondida] = useState<{ llamadaId: string; r: Respuesta } | null>(null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [avisosActivos, setAvisosActivos] = useState(false);
  const [notif, setNotif] = useState<EstadoNotificaciones>("cargando");
  const audioRef = useRef<AudioContext | null>(null);
  const id = contacto as IdContacto;

  // Si este teléfono ya tenía notificaciones, se lo recuerda al servidor (por si se reinició).
  useEffect(() => {
    if (enMarco) return;
    const s = soporte();
    if (s !== "si") return setNotif(s);
    if (Notification.permission === "denied") return setNotif("bloqueadas");
    if (Notification.permission !== "granted") return setNotif("apagadas");
    let vivo = true;
    void suscribir(canal, id).then((ok) => vivo && setNotif(ok ? "activas" : "apagadas"));
    return () => {
      vivo = false;
    };
  }, [canal, id, enMarco]);

  useEffect(() => {
    let vivo = true;
    async function revisar() {
      const r = await fetch(api, { cache: "no-store" }).catch(() => null);
      if (!vivo) return;
      setConectado(Boolean(r?.ok));
      if (!r?.ok) return;
      const { pregunta: p } = (await r.json()) as { pregunta: VistaFamiliar };
      if (vivo) setPregunta(p);
    }
    void revisar();
    const t = setInterval(revisar, 2_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [api]);

  const pendiente = pregunta && respondida?.llamadaId !== pregunta.llamadaId ? pregunta : null;
  const idPendiente = pendiente?.llamadaId ?? null;

  // Vibra y suena cada 3 s mientras haya una pregunta sin contestar.
  useEffect(() => {
    if (!idPendiente || enMarco) return;
    const avisar = () => {
      navigator.vibrate?.([400, 150, 400, 150, 400]);
      const ctx = audioRef.current;
      if (!ctx) return;
      for (const [i, f] of [880, 660, 880].entries()) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.value = 0.15;
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.18);
        o.stop(ctx.currentTime + i * 0.18 + 0.14);
      }
    };
    avisar();
    const t = setInterval(avisar, 3_000);
    return () => clearInterval(t);
  }, [idPendiente, enMarco]);

  const puedeNotificar = notif === "apagadas" || notif === "error";

  async function activarAvisos() {
    // El permiso de notificaciones se pide primero, mientras el toque sigue «fresco» para el navegador.
    const permiso = puedeNotificar ? activarNotificaciones(canal, id) : null;
    // El navegador solo deja sonar audio después de un toque; la pantalla encendida evita que se duerma la página.
    audioRef.current ??= new AudioContext();
    await audioRef.current.resume();
    try {
      await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } }).wakeLock?.request("screen");
    } catch {
      // sin permiso o sin HTTPS: la página sigue funcionando
    }
    setAvisosActivos(true);
    if (permiso) setNotif(await permiso);
  }

  async function responder(r: Respuesta) {
    if (!pendiente) return;
    setRespondida({ llamadaId: pendiente.llamadaId, r });
    void cerrarNotificaciones(pendiente.llamadaId);
    if ("noSe" in r) return;
    await fetch(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ llamadaId: pendiente.llamadaId, estaBien: r.estaBien }),
    }).catch(() => null);
  }

  const alto = enMarco ? "h-full" : "min-h-dvh";
  const titulo = enMarco ? "text-3xl" : "text-4xl sm:text-5xl";

  if (pendiente) {
    const t = pendiente.texto;
    return (
      <main className={`${alto} flex flex-col justify-center gap-5 bg-noche px-5 py-8 ring-8 ring-alerta ring-inset motion-safe:animate-inundar`}>
        <span className="grid size-14 place-items-center rounded-full bg-alerta motion-safe:animate-timbre" aria-hidden="true">
          <Marca tono="papel" className="size-9" />
        </span>
        <h1 className={`font-display leading-none font-extrabold tracking-[-0.03em] ${enMarco ? "text-5xl" : "text-6xl"}`}>{t.titulo}</h1>
        <p className={enMarco ? "text-base text-papel/80" : "text-xl text-papel/80"}>{t.detalle}</p>
        <button onClick={() => responder({ estaBien: true })} className="rounded-full bg-senal px-6 py-5 font-display text-2xl font-extrabold text-tinta">
          {t.si}
        </button>
        <button onClick={() => responder({ estaBien: false })} className="rounded-full bg-peligro px-6 py-4 text-lg font-bold text-tinta">
          {t.no}
        </button>
        {t.noSe && (
          <button onClick={() => responder({ noSe: true })} className="rounded-full border border-papel/30 px-6 py-3 text-base">
            {t.noSe}
          </button>
        )}
      </main>
    );
  }

  const bien = respondida && "estaBien" in respondida.r ? respondida.r.estaBien : null;

  return (
    <main className={`${alto} mx-auto flex max-w-md flex-col gap-6 bg-noche px-5 py-8`}>
      <header className="flex items-center gap-2">
        <Marca tono="papel" className="size-7" />
        <span className="text-[0.8125rem] font-semibold tracking-[0.14em] text-papel/60 uppercase">Teléfono de {nombre}</span>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5">
        {bien === true ? (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-senal text-3xl font-black text-tinta motion-safe:animate-inundar" aria-hidden="true">
              ✓
            </span>
            <h1 className={`font-display leading-tight font-extrabold tracking-[-0.02em] ${titulo}`}>Listo. Ya le avisamos a {quien} que estás bien.</h1>
          </>
        ) : bien === false ? (
          <>
            <h1 className={`font-display leading-tight font-extrabold tracking-[-0.02em] ${titulo}`}>Avisamos que necesitas ayuda.</h1>
            <a href="tel:911" className="rounded-full bg-papel px-6 py-5 text-center font-display text-2xl font-extrabold text-tinta">
              Llamar al 911
            </a>
          </>
        ) : (
          <>
            <span className="relative grid size-16 place-items-center" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-senal/20 motion-safe:animate-latir" />
              <span className="size-5 rounded-full bg-senal" />
            </span>
            {notif === "activas" ? (
              <>
                <h1 className={`font-display leading-tight font-extrabold tracking-[-0.02em] ${titulo}`}>Listo. Ya puedes cerrar esta página.</h1>
                <p className="text-lg text-papel/70">
                  Si alguien llama a {quien} diciendo que te tiene, te llega una notificación: «¿Estás bien?». Contestas con un toque, sin interrumpir la
                  llamada.
                </p>
              </>
            ) : (
              <>
                <h1 className={`font-display leading-tight font-extrabold tracking-[-0.02em] ${titulo}`}>
                  {puedeNotificar ? "Activa las notificaciones." : "Deja esta página abierta."}
                </h1>
                <p className={enMarco ? "text-base text-papel/70" : "text-lg text-papel/70"}>
                  Si alguien llama a {quien} diciendo que te tiene, {puedeNotificar ? "te llega una notificación" : "aquí te preguntamos"} si estás bien.
                  Contestas con un toque, sin interrumpir la llamada.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {!enMarco && notif === "instalar" && (
        <p className="rounded-tarjeta bg-noche-2 px-4 py-3 text-papel/80">
          En iPhone, para recibir notificaciones: toca <strong className="text-papel">Compartir</strong> y luego{" "}
          <strong className="text-papel">Agregar a inicio</strong>. Abre Cuelga desde tu pantalla de inicio y actívalas ahí.
        </p>
      )}
      {!enMarco && notif === "bloqueadas" && (
        <p className="rounded-tarjeta bg-noche-2 px-4 py-3 text-papel/80">Las notificaciones están bloqueadas en este navegador. Permítelas en sus ajustes.</p>
      )}
      {!enMarco && notif === "error" && <p className="text-papel/70">No se pudieron activar las notificaciones. Intenta otra vez.</p>}
      {!enMarco && notif !== "cargando" && (puedeNotificar || (!avisosActivos && notif !== "activas")) && (
        <button onClick={activarAvisos} className="rounded-full bg-papel px-6 py-4 text-lg font-bold text-tinta">
          {puedeNotificar ? "Activar notificaciones" : "Activar sonido y vibración"}
        </button>
      )}
      <p className={`flex items-center gap-2 text-sm ${conectado === false ? "text-peligro" : "text-papel/50"}`}>
        <span className={`size-2 rounded-full ${conectado === false ? "bg-peligro" : conectado ? "bg-senal" : "bg-papel/40"}`} />
        {conectado === null ? "Conectando…" : conectado ? "Conectado" : "Sin conexión. Reintentando…"}
      </p>
    </main>
  );
}
