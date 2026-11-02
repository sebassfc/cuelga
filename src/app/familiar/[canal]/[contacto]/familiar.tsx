"use client";

import { use, useEffect, useRef, useState } from "react";
import type { VistaFamiliar } from "@/lib/llamada";

type Respuesta = { estaBien: boolean } | { noSe: true };

/** Teléfono del familiar: espera en silencio y solo suena cuando alguien necesita saber que está bien. */
export function Familiar({ params, searchParams }: { params: Promise<{ canal: string; contacto: string }>; searchParams: Promise<{ n?: string; de?: string }> }) {
  const { canal, contacto } = use(params);
  const { n, de } = use(searchParams);
  const nombre = n?.slice(0, 40) || "tú";
  const quien = de?.slice(0, 40) || "tu familia";
  const api = `/api/familiar/${encodeURIComponent(canal)}/${encodeURIComponent(contacto)}`;

  const [pregunta, setPregunta] = useState<NonNullable<VistaFamiliar> | null>(null);
  const [respondida, setRespondida] = useState<{ llamadaId: string; r: Respuesta } | null>(null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [avisosActivos, setAvisosActivos] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

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
    if (!idPendiente) return;
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
  }, [idPendiente]);

  async function activarAvisos() {
    // El navegador solo deja sonar audio después de un toque; la pantalla encendida evita que se duerma la página.
    audioRef.current ??= new AudioContext();
    await audioRef.current.resume();
    try {
      await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } }).wakeLock?.request("screen");
    } catch {
      // sin permiso o sin HTTPS: la página sigue funcionando
    }
    setAvisosActivos(true);
  }

  async function responder(r: Respuesta) {
    if (!pendiente) return;
    setRespondida({ llamadaId: pendiente.llamadaId, r });
    if ("noSe" in r) return;
    await fetch(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ llamadaId: pendiente.llamadaId, estaBien: r.estaBien }),
    }).catch(() => null);
  }

  if (pendiente) {
    const t = pendiente.texto;
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-6 border-8 border-orange-500 bg-zinc-950 px-5 py-8">
        <h1 className="text-5xl leading-tight font-black">{t.titulo}</h1>
        <p className="text-xl">{t.detalle}</p>
        <button onClick={() => responder({ estaBien: true })} className="rounded-3xl bg-green-500 px-6 py-7 text-2xl font-black text-black">
          {t.si}
        </button>
        <button onClick={() => responder({ estaBien: false })} className="rounded-3xl bg-red-600 px-6 py-5 text-xl font-bold">
          {t.no}
        </button>
        {t.noSe && (
          <button onClick={() => responder({ noSe: true })} className="rounded-3xl border border-zinc-600 px-6 py-4 text-lg">
            {t.noSe}
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-8">
      <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">Cuelga · teléfono de {nombre}</p>
      {respondida && "estaBien" in respondida.r ? (
        respondida.r.estaBien ? (
          <h1 className="text-4xl font-black">Listo. Ya le avisamos a {quien} que estás bien.</h1>
        ) : (
          <>
            <h1 className="text-4xl font-black">Avisamos que necesitas ayuda.</h1>
            <a href="tel:911" className="rounded-3xl bg-white px-6 py-5 text-center text-2xl font-black text-black">
              Llamar al 911
            </a>
          </>
        )
      ) : (
        <>
          <h1 className="text-4xl leading-tight font-black">Deja esta página abierta.</h1>
          <p className="text-lg text-zinc-300">
            Si alguien llama a {quien} diciendo que te tiene, aquí te preguntaremos si estás bien. Contestas con un toque, sin interrumpir la llamada.
          </p>
        </>
      )}
      {!avisosActivos && (
        <button onClick={activarAvisos} className="rounded-2xl bg-white px-6 py-4 text-lg font-bold text-black">
          Activar sonido y vibración
        </button>
      )}
      <p className={`text-sm ${conectado === false ? "text-red-400" : "text-zinc-500"}`}>
        {conectado === null ? "Conectando…" : conectado ? "Conectado. Revisando cada 2 segundos." : "Sin conexión. Reintentando…"}
      </p>
    </main>
  );
}
