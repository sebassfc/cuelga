"use client";

import { useEffect, useState } from "react";
import { mensaje } from "@/lib/policy";
import { ETAPA_INFO, ETAPAS } from "@/lib/stages";
import { textoPregunta } from "@/lib/llamada";
import { Marca } from "./marca";

/**
 * La portada muestra el producto andando: el guion de ejemplo entra a la pantalla de casa, se encienden las etapas,
 * el teléfono de Ana pregunta, ella contesta y la casa se pone verde. Los textos salen del mismo catálogo que la app.
 */

const LINEAS = [
  { quien: "Llamante", texto: "¡Abuelita, ayúdame, por favor! ¡Me tienen!", etapa: "gancho" },
  { quien: "En casa", texto: "¿Ana? ¿Qué pasa, mija? ¿Dónde estás?", etapa: null },
  { quien: "Llamante", texto: "Señora, cállese y escuche. No cuelgue y no le diga a nadie.", etapa: "aislamiento" },
  { quien: "Llamante", texto: "Habla el comandante. Sabemos dónde vive usted.", etapa: "autoridad" },
] as const;

const PREGUNTA = textoPregunta("esta_bien", { quienEscucha: "Abuela Mari", protegido: "Ana" });
const ALERTA = mensaje("alerta", "Ana");

// Cuadro por cuadro: cuántas líneas se ven, si el teléfono pregunta, si Ana ya tocó "sí", si la casa está verde.
const CUADROS = [
  { lineas: 0, pregunta: false, toque: false, verde: false },
  { lineas: 1, pregunta: false, toque: false, verde: false },
  { lineas: 2, pregunta: false, toque: false, verde: false },
  { lineas: 3, pregunta: true, toque: false, verde: false },
  { lineas: 4, pregunta: true, toque: false, verde: false },
  { lineas: 4, pregunta: true, toque: true, verde: false },
  { lineas: 4, pregunta: false, toque: true, verde: true },
  { lineas: 4, pregunta: false, toque: true, verde: true },
  { lineas: 4, pregunta: false, toque: true, verde: true },
];
const INICIAL = 3;
const FINAL = 6;

export function Escena() {
  const [i, setI] = useState(INICIAL);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setI(FINAL);
      return;
    }
    const t = setInterval(() => setI((n) => (n + 1) % CUADROS.length), 1_600);
    return () => clearInterval(t);
  }, []);

  const c = CUADROS[i];
  const vistas = LINEAS.slice(0, c.lineas);
  const etapas = new Set<string>(vistas.flatMap((l) => (l.etapa ? [l.etapa] : [])));
  const alerta = c.lineas >= 3;

  return (
    <div className="relative mx-auto w-full max-w-[600px] pt-4 pb-10" aria-label="Simulación: Cuelga durante una llamada de ejemplo" role="img">
      {/* Pantalla de casa */}
      <div className="relative w-[80%] overflow-hidden rounded-equipo bg-noche p-4 text-papel shadow-equipo sm:w-[78%] sm:p-5 lg:[transform:perspective(1400px)_rotateY(-6deg)_rotateX(3deg)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Marca tono="papel" className="size-5" />
            <span className="text-[0.6875rem] font-semibold tracking-[0.14em] text-papel/55 uppercase">Pantalla de casa</span>
          </span>
          <span className="text-[0.6875rem] text-papel/40">Protegiendo a Ana</span>
        </div>

        <div className={`mt-3 rounded-tarjeta p-3.5 transition-colors duration-500 ${alerta ? "bg-alerta/20" : "bg-noche-2"}`}>
          <p className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-papel/65 uppercase">
            <span className={`size-1.5 rounded-full motion-safe:animate-latir ${alerta ? "bg-alerta" : "bg-papel"}`} />
            {alerta ? "Verificando en silencio" : "Escuchando"}
          </p>
          <p className="mt-1.5 font-display text-[1.0625rem] leading-snug font-bold sm:text-lg">
            {alerta ? ALERTA : "Escuchando la llamada…"}
          </p>
        </div>

        <ol className="mt-3 grid grid-cols-5 gap-1">
          {ETAPAS.filter((e) => e !== "ninguna").map((e) => (
            <li
              key={e}
              className={`rounded-lg px-1.5 py-1.5 text-[0.6875rem] leading-tight transition-colors duration-500 sm:text-[0.6875rem] ${etapas.has(e) ? "bg-alerta font-semibold text-tinta" : "bg-noche-3 text-papel/40"}`}
            >
              {ETAPA_INFO[e].nombre}
            </li>
          ))}
        </ol>

        <ol className="mt-3 flex h-[168px] flex-col justify-end gap-2 overflow-hidden">
          {vistas.map((l) => (
            <li key={l.texto} className={`flex max-w-[86%] flex-col gap-0.5 motion-safe:animate-subir ${l.quien === "Llamante" ? "self-start" : "items-end self-end"}`}>
              <span className="text-[0.6875rem] text-papel/45">{l.quien}</span>
              <span className={`rounded-2xl px-2.5 py-1.5 text-[0.8125rem] leading-snug ${l.quien === "Llamante" ? "rounded-tl-md bg-noche-3" : "rounded-tr-md bg-papel/10"}`}>{l.texto}</span>
            </li>
          ))}
        </ol>

        {c.verde && (
          <div className="absolute inset-0 flex flex-col items-start justify-center gap-2 bg-senal py-6 pr-[30%] pl-6 text-tinta motion-safe:animate-inundar">
            <span className="font-display text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] sm:text-4xl">
              ANA ESTÁ A SALVO.
              <br />
              CUELGA.
            </span>
            <span className="text-sm font-semibold">Confirmado sin colgar.</span>
          </div>
        )}
      </div>

      {/* Teléfono de Ana */}
      <div className="absolute top-[30%] right-0 w-[34%] min-w-[136px] motion-safe:animate-flotar">
        <div className="aspect-[9/18.5] overflow-hidden rounded-[2rem] border-[7px] border-tinta bg-noche text-papel shadow-equipo">
          {c.pregunta ? (
            <div className="flex h-full flex-col justify-center gap-2.5 p-3.5 ring-4 ring-alerta ring-inset">
              <span className="grid size-8 place-items-center rounded-full bg-alerta motion-safe:animate-timbre">
                <Marca tono="papel" className="size-5" />
              </span>
              <span className="font-display text-2xl leading-none font-extrabold tracking-[-0.03em]">{PREGUNTA.titulo}</span>
              <span className="text-[0.6875rem] leading-snug text-papel/70">{PREGUNTA.detalle}</span>
              <span className={`rounded-full px-2 py-2 text-center text-xs font-extrabold text-tinta transition-transform duration-200 ${c.toque ? "scale-95 bg-senal ring-4 ring-senal/40" : "bg-senal"}`}>
                {PREGUNTA.si}
              </span>
              <span className="rounded-full bg-peligro px-2 py-1.5 text-center text-[0.6875rem] font-bold text-tinta">{PREGUNTA.no}</span>
            </div>
          ) : c.toque ? (
            <div className="flex h-full flex-col justify-center gap-3 p-4">
              <span className="grid size-9 place-items-center rounded-full bg-senal text-lg font-black text-tinta">✓</span>
              <span className="font-display text-lg leading-tight font-extrabold">Listo. Ya le avisamos a Abuela Mari que estás bien.</span>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3 p-4">
              <span className="relative grid size-9 place-items-center">
                <span className="absolute inset-0 rounded-full bg-senal/25 motion-safe:animate-latir" />
                <span className="size-3 rounded-full bg-senal" />
              </span>
              <span className="font-display text-lg leading-tight font-extrabold">Deja esta página abierta.</span>
              <span className="text-[0.6875rem] text-papel/55">Teléfono de Ana · conectado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
