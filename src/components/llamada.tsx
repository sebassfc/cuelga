"use client";

import { useEffect, useRef } from "react";
import type { TurnoVista, VistaEscucha } from "@/lib/llamada";
import type { Fase } from "@/lib/policy";
import { ETAPA_INFO, ETAPAS } from "@/lib/stages";

/** Piezas de la pantalla de casa durante una llamada. Las usan /escuchar y /demo. */

const FASE: Record<Fase, { etiqueta: string; caja: string; punto: string }> = {
  escuchando: { etiqueta: "Escuchando", caja: "border-borde bg-noche-2", punto: "bg-papel" },
  atencion: { etiqueta: "Atención", caja: "border-alerta/50 bg-noche-2", punto: "bg-alerta" },
  verificando: { etiqueta: "Verificando en silencio", caja: "border-alerta bg-alerta/10", punto: "bg-alerta" },
  segundo_contacto: { etiqueta: "Preguntando al respaldo", caja: "border-alerta bg-alerta/10", punto: "bg-alerta" },
  sin_respuesta: { etiqueta: "Nadie ha confirmado", caja: "border-peligro bg-peligro/10", punto: "bg-peligro" },
  a_salvo: { etiqueta: "A salvo", caja: "border-senal bg-senal/10", punto: "bg-senal" },
  pidio_ayuda: { etiqueta: "Pidió ayuda", caja: "border-peligro bg-peligro/20", punto: "bg-peligro" },
};

export function EstadoLlamada({
  vista,
  protegido,
  respaldo,
  esperaSeg,
  activa,
  textoInactivo,
  subtitulo,
}: {
  vista: VistaEscucha;
  protegido: string;
  respaldo: string | null;
  esperaSeg: number;
  activa: boolean;
  textoInactivo: string;
  /** Traducción del mensaje, solo en la demo. */
  subtitulo?: string;
}) {
  const f = FASE[vista.fase];
  const texto = vista.mensaje?.texto ?? (activa ? textoInactivo : vista.etapas.length ? "Llamada terminada." : "Llamada terminada. No escuchamos el guion de extorsión.");
  const siguiente = respaldo ? `preguntamos a ${respaldo}` : "te diremos que cuelgues y llames al 089";
  const esperando = vista.fase === "verificando" || vista.fase === "segundo_contacto";

  return (
    <div className={`rounded-equipo border-2 p-5 transition-colors duration-500 sm:p-6 ${f.caja}`} aria-live="assertive">
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold tracking-[0.14em] text-papel/70 uppercase">
        <span className={`size-2 rounded-full ${f.punto} ${activa ? "motion-safe:animate-latir" : ""}`} />
        {activa ? f.etiqueta : vista.terminada ? "Llamada terminada" : f.etiqueta}
      </p>
      <p className="mt-3 font-display text-2xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-3xl">{texto}</p>
      {subtitulo && <p className="mt-1 text-sm text-papel/50 italic">{subtitulo}</p>}

      {vista.preguntas.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {vista.preguntas.map((p) => (
            <li key={p.nombre} className="flex items-center gap-3 text-base">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  p.estaBien === true ? "bg-senal text-tinta" : p.estaBien === false ? "bg-peligro text-tinta" : "border-2 border-alerta"
                }`}
                aria-hidden="true"
              >
                {p.estaBien === true ? "✓" : p.estaBien === false ? "✗" : ""}
              </span>
              <span>
                {p.estaBien === true
                  ? `${p.nombre} respondió que está bien`
                  : p.estaBien === false
                    ? `${p.nombre} respondió que NO está bien`
                    : `Preguntando en silencio a ${p.nombre}…`}
              </span>
              {p.estaBien === null && p.esperandoSeg !== null && <span className="ml-auto text-sm tabular-nums text-papel/60">{p.esperandoSeg} s</span>}
            </li>
          ))}
        </ul>
      )}

      {esperando && vista.escalaEnSeg !== null && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-papel/10">
            <div className="h-full rounded-full bg-alerta transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (vista.escalaEnSeg / esperaSeg) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-papel/70">
            {vista.fase === "verificando" ? `Si ${protegido} no contesta en ${vista.escalaEnSeg} s, ${siguiente}.` : `Si nadie contesta en ${vista.escalaEnSeg} s: cuelga y llama al 089.`}
          </p>
        </div>
      )}

      {vista.numero && (
        <a href={`tel:${vista.numero}`} className="mt-5 block rounded-full bg-papel px-6 py-4 text-center font-display text-2xl font-extrabold text-tinta">
          Llamar al {vista.numero}
        </a>
      )}
    </div>
  );
}

export function PistaEtapas({ etapas }: { etapas: VistaEscucha["etapas"] }) {
  const lista = ETAPAS.filter((e) => e !== "ninguna");
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-papel/50 uppercase">El guion de la extorsión</p>
      <ol className="mt-2 grid grid-cols-5 gap-1.5" aria-label="Etapas del guion de extorsión que se han oído">
        {lista.map((e) => {
          const oida = etapas.includes(e);
          return (
            <li
              key={e}
              className={`flex min-h-14 flex-col justify-between rounded-xl px-2 py-2 text-xs leading-tight transition-colors duration-500 ${
                oida ? "bg-alerta font-semibold text-tinta" : "bg-noche-3 text-papel/45"
              }`}
            >
              <span className="tabular-nums opacity-70">{ETAPA_INFO[e].orden}</span>
              <span>{ETAPA_INFO[e].nombre}</span>
              <span className="sr-only">{oida ? "oída" : "no oída"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const FUENTE: Record<TurnoVista["fuente"], string> = { lexico: "léxico", modelo: "modelo", ambos: "léxico + modelo", pendiente: "revisando…" };

export function Transcripcion({ turnos, traduccion, max = "max-h-80" }: { turnos: TurnoVista[]; traduccion?: (texto: string) => string | undefined; max?: string }) {
  const lista = useRef<HTMLOListElement>(null);
  // Baja solo dentro de la lista: scrollIntoView movería también la página.
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turnos.length]);
  return (
    <div className="rounded-equipo border border-borde bg-noche-2 p-4">
      <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-papel/50 uppercase">Lo que se oye</p>
      {turnos.length === 0 ? (
        <p className="mt-3 text-sm text-papel/45">Aquí aparece cada frase, con quién la dijo.</p>
      ) : (
        <ol ref={lista} className={`mt-3 flex flex-col gap-2.5 overflow-y-auto pr-1 ${max}`}>
          {turnos.map((t, i) => {
            const llamante = t.hablante === "llamante";
            const ingles = traduccion?.(t.texto);
            return (
              <li key={i} className={`flex max-w-[88%] flex-col gap-1 motion-safe:animate-subir ${llamante ? "self-start" : "self-end items-end"}`}>
                <span className="text-xs text-papel/50">{llamante ? "Llamante" : t.hablante === "receptor" ? "En casa" : "Voz"}</span>
                <span className={`rounded-2xl px-3 py-2 text-[0.9375rem] leading-snug ${llamante ? "rounded-tl-md bg-noche-3" : "rounded-tr-md bg-papel/10"}`}>
                  {t.texto}
                  {ingles && <span className="mt-1 block text-xs text-papel/50 italic">{ingles}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  {t.etapa !== "ninguna" && <span className="rounded-md bg-alerta/15 px-1.5 py-0.5 font-semibold text-alerta">{ETAPA_INFO[t.etapa].nombre}</span>}
                  <span className="text-papel/35">{FUENTE[t.fuente]}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function Metricas({ vista, enviando = 0 }: { vista: VistaEscucha; enviando?: number }) {
  const datos = [
    vista.segAlerta !== null && `Alerta a los ${vista.segAlerta} s`,
    vista.segASalvo !== null && `a salvo a los ${vista.segASalvo} s`,
    vista.segLlamada !== null && `llamada ${minutos(vista.segLlamada)}`,
    `gasto $${vista.usd.toFixed(3)}`,
    enviando > 0 && "escuchando un trozo…",
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm tabular-nums text-papel/50">{datos.join(" · ")}</p>
      {vista.avisos.map((a, i) => (
        <p key={i} className="text-sm text-alerta">
          {a}
        </p>
      ))}
    </div>
  );
}

function minutos(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** La pantalla que importa: verde completa, enorme, para leerse a dos metros con el teléfono en la mano. */
export function PantallaASalvo({ nombre, seg, alCerrar, contenida = false }: { nombre: string; seg: number | null; alCerrar: () => void; contenida?: boolean }) {
  return (
    <button
      onClick={alCerrar}
      className={`${contenida ? "absolute rounded-equipo" : "fixed"} inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-senal p-6 text-center text-tinta motion-safe:animate-inundar`}
    >
      <span className={`font-display leading-[0.95] font-extrabold tracking-[-0.03em] ${contenida ? "text-4xl sm:text-5xl" : "text-6xl sm:text-8xl"}`}>
        {nombre} ESTÁ A SALVO.
        <br />
        CUELGA.
      </span>
      {seg !== null && <span className="text-lg font-semibold">Confirmado {seg} s después de la primera frase del extorsionador.</span>}
      <span className="text-sm underline underline-offset-4">Toca para ver el detalle</span>
    </button>
  );
}
