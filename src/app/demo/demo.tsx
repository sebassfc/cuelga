"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Telefono } from "@/app/familiar/[canal]/[contacto]/familiar";
import { Barra } from "@/components/barra";
import { EstadoLlamada, Metricas, PantallaASalvo, PistaEtapas, Transcripcion } from "@/components/llamada";
import { Marca } from "@/components/marca";
import { nuevoCanal, type Familia } from "@/lib/cliente/familia";
import { useLlamada } from "@/lib/cliente/usar-llamada";
import type { ClaveMensaje } from "@/lib/policy";

/** Para quien no lee español: el guion sv-01 y los mensajes del catálogo, traducidos. Solo en la demo. */
const INGLES: Record<string, string> = {
  "¡Abuelita, ayúdame, por favor! ¡Me tienen!": "Grandma, help me, please! They've got me!",
  "¿Ana? ¿Qué pasa, mija? ¿Dónde estás?": "Ana? What's wrong, sweetie? Where are you?",
  "Señora, cállese y escuche. No cuelgue y no le diga a nadie.": "Ma'am, be quiet and listen. Don't hang up and don't tell anyone.",
  "Habla el comandante. Sabemos dónde vive usted.": "This is the commander. We know where you live.",
  "Queremos cincuenta mil pesos hoy o a la muchacha le va a pasar algo.": "We want fifty thousand pesos today or something will happen to the girl.",
  "Vaya al OXXO más cercano y deposite a la tarjeta que le voy a dictar.": "Go to the nearest OXXO and deposit to the card I'm about to read you.",
};
const INGLES_MENSAJE: Record<ClaveMensaje, string> = {
  atencion: "Listening. Don't give names, addresses or family details.",
  alerta: "This looks like virtual kidnapping. Don't give details or deposit. We're silently checking on Ana.",
  a_salvo: "Ana is safe. Hang up.",
  sin_respuesta_primero: "Ana hasn't answered yet. We're asking Lucía. Don't deposit or give details.",
  sin_respuesta_final: "Nobody has confirmed yet. Hang up and call 089 (anonymous reporting). Don't deposit.",
  pidio_ayuda: "Ana says she is NOT okay. Call 911 now.",
};

const PASOS = [
  { es: "Empieza la llamada", en: "Start the call" },
  { es: "Cuelga reconoce el guion", en: "Cuelga spots the scam script" },
  { es: "Ana contesta en su teléfono", en: "Ana answers on her phone" },
  { es: "Cuelgas", en: "You hang up" },
];

const ESPERA_DEMO = 15;

export function Demo() {
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [verde, setVerde] = useState(true);
  const [telefono, setTelefono] = useState<"protegido" | "respaldo">("protegido");
  const llamada = useLlamada(familia);
  const { vista, activa } = llamada;

  // Una familia de demo por visita: así dos jueces a la vez no se contestan entre sí.
  useEffect(() => {
    setFamilia({ canal: nuevoCanal(), quienEscucha: "Abuela Mari", protegido: "Ana", respaldo: "Lucía", esperaSeg: ESPERA_DEMO, base: window.location.origin });
  }, []);

  const fase = vista?.fase;
  useEffect(() => {
    if (fase === "segundo_contacto") setTelefono("respaldo");
  }, [fase]);

  // En pantallas angostas la casa y el teléfono quedan uno debajo del otro: se lleva la vista a donde pasa algo.
  const casaRef = useRef<HTMLDivElement>(null);
  const telefonoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const destino = fase === "verificando" || fase === "segundo_contacto" ? telefonoRef.current : fase === "a_salvo" ? casaRef.current : null;
    destino?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [fase]);

  const paso = !vista ? 0 : fase === "a_salvo" ? 3 : fase === "escuchando" || fase === "atencion" ? 1 : 2;
  const preguntaA = (nombre: string) => vista?.preguntas.some((p) => p.nombre === nombre && p.estaBien === null) ?? false;

  function empezar() {
    setVerde(true);
    setTelefono("protegido");
    llamada.nueva();
    void llamada.empezar("guion");
  }

  return (
    <main className="min-h-dvh bg-papel text-tinta">
      <Barra />

      <section className="mx-auto max-w-6xl px-4 pt-2 pb-6 sm:px-6 sm:pt-4">
        <h1 className="max-w-3xl font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
          Una llamada de secuestro virtual, de principio a fin.
        </h1>
        <p className="mt-2 max-w-2xl text-tinta-2">
          Dura un minuto. Empieza la llamada de ejemplo y, cuando el teléfono de Ana pregunte «¿Estás bien?», contesta tú.
          <span className="block text-sm italic">In English: a scripted scam call plays in Spanish, with subtitles. When Ana&apos;s phone asks if she&apos;s okay, tap the green button.</span>
        </p>

        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PASOS.map((p, i) => (
            <li
              key={p.es}
              className={`rounded-tarjeta px-4 py-3 transition-colors duration-500 ${i === paso ? "bg-tinta text-papel" : i < paso ? "bg-papel-2 text-tinta" : "bg-papel-2/60 text-tinta-2"}`}
              aria-current={i === paso ? "step" : undefined}
            >
              <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
                <span className={`grid size-5 place-items-center rounded-full text-xs ${i < paso ? "bg-senal text-tinta" : i === paso ? "bg-papel text-tinta" : "border border-tinta-2/40"}`}>
                  {i < paso ? "✓" : i + 1}
                </span>
                {p.es}
              </span>
              <span className={`mt-0.5 block text-xs ${i === paso ? "text-papel/60" : "text-tinta-2/80"}`}>{p.en}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Pantalla de casa */}
        <div ref={casaRef} className="relative flex min-h-[600px] scroll-mt-20 flex-col gap-4 rounded-equipo bg-noche p-4 text-papel shadow-equipo sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Marca tono="papel" className="size-6" />
              <span className="text-[0.8125rem] font-semibold tracking-[0.14em] text-papel/60 uppercase">Pantalla de casa</span>
            </span>
            <span className="text-sm text-papel/50">Contesta Abuela Mari · protege a Ana</span>
          </div>

          {!vista ? (
            <div className="flex flex-1 flex-col items-center justify-start gap-5 pt-8 text-center sm:pt-12">
              <span className="relative grid size-24 place-items-center" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-alerta/20 motion-safe:animate-latir" />
                <span className="grid size-16 place-items-center rounded-full bg-alerta motion-safe:animate-timbre">
                  <Marca tono="papel" className="size-10" />
                </span>
              </span>
              <p className="font-display text-3xl font-extrabold tracking-[-0.02em]">Suena el teléfono de la abuela.</p>
              <p className="max-w-sm text-papel/60">Número desconocido. Al contestar, alguien llora: «¡Abuelita, ayúdame!»</p>
              <button onClick={empezar} disabled={!familia} className="rounded-full bg-papel px-8 py-4 font-display text-xl font-extrabold text-tinta disabled:opacity-40">
                Empezar la llamada de ejemplo
              </button>
              <p className="max-w-sm text-xs text-papel/40">Guion sintético. Cada frase la revisa Muse Spark Open, el modelo abierto de Meta.</p>
            </div>
          ) : (
            <>
              <EstadoLlamada
                vista={vista}
                protegido="Ana"
                respaldo="Lucía"
                esperaSeg={ESPERA_DEMO}
                activa={activa}
                textoInactivo="Escuchando la llamada…"
                subtitulo={vista.mensaje ? INGLES_MENSAJE[vista.mensaje.clave] : undefined}
              />
              <PistaEtapas etapas={vista.etapas} />
              <Transcripcion turnos={vista.turnos} traduccion={(t) => INGLES[t]} max="max-h-64" />
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <Metricas vista={vista} enviando={llamada.enviando} />
                {activa ? (
                  <button onClick={() => llamada.colgar()} className="rounded-full border border-papel/30 px-5 py-2.5 font-semibold">
                    Ya colgué
                  </button>
                ) : (
                  <button onClick={empezar} className="rounded-full bg-papel px-5 py-2.5 font-semibold text-tinta">
                    Otra vez
                  </button>
                )}
              </div>
            </>
          )}
          {llamada.error && <p className="rounded-tarjeta border border-peligro bg-peligro/10 px-4 py-3 text-papel">{llamada.error}</p>}
          {fase === "a_salvo" && verde && <PantallaASalvo nombre="Ana" seg={vista?.segASalvo ?? null} alCerrar={() => setVerde(false)} contenida />}
        </div>

        {/* Teléfonos de la familia */}
        <div ref={telefonoRef} className="flex scroll-mt-4 flex-col items-center gap-3">
          <div className="flex gap-1 rounded-full bg-papel-2 p-1" role="tablist" aria-label="Teléfono que se muestra">
            {(["protegido", "respaldo"] as const).map((c) => {
              const nombre = c === "protegido" ? "Ana" : "Lucía";
              return (
                <button
                  key={c}
                  role="tab"
                  aria-selected={telefono === c}
                  onClick={() => setTelefono(c)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${telefono === c ? "bg-tinta text-papel" : "text-tinta-2"}`}
                >
                  {preguntaA(nombre) && <span className="size-2 rounded-full bg-alerta motion-safe:animate-latir" />}
                  <span className="sr-only">Teléfono de </span>
                  {nombre}
                </button>
              );
            })}
          </div>
          <div className="relative h-[600px] w-[300px] overflow-hidden rounded-telefono border-[10px] border-tinta bg-noche text-papel shadow-equipo">
            <span className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-tinta" aria-hidden="true" />
            {familia &&
              (["protegido", "respaldo"] as const).map((c) => (
                <div key={c} className={`h-full pt-6 ${telefono === c ? "" : "hidden"}`}>
                  <Telefono canal={familia.canal} contacto={c} nombre={c === "protegido" ? "Ana" : "Lucía"} quien="Abuela Mari" enMarco />
                </div>
              ))}
          </div>
          <p className="max-w-[300px] text-center text-sm text-tinta-2">
            {fase === "verificando"
              ? `¿Y si Ana no contesta? No toques nada: en ${ESPERA_DEMO} s Cuelga le pregunta a Lucía.`
              : fase === "segundo_contacto"
                ? "Ana no contestó. Ahora le preguntamos a Lucía."
                : "En la vida real, cada familiar abre su enlace una vez en su propio teléfono."}
          </p>
        </div>
      </section>

      <section className="bg-noche text-papel">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">Ahora con tu familia.</h2>
            <p className="mt-2 max-w-xl text-lg text-papel/70">Configúralo en un minuto. Con una llamada real en altavoz, Cuelga escucha por el micrófono.</p>
          </div>
          <Link href="/escuchar" className="rounded-full bg-papel px-7 py-4 font-display text-xl font-extrabold text-tinta">
            Usar con mi familia
          </Link>
        </div>
      </section>
    </main>
  );
}
