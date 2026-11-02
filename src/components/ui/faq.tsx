"use client";

// Adaptado de FAQ 6 de Hirael <https://hirael.com/blocks/faqs/faq-06>, vía 21st.dev.
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
// Sin Radix ni motion: un acordeón pequeño con transición de altura en CSS.

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type Pregunta = { p: string; r: string };

export function Faq({ titulo, texto, preguntas }: { titulo: string; texto: string; preguntas: Pregunta[] }) {
  // El título en dos tonos, como el original: la primera mitad apagada, la segunda en tinta.
  const palabras = titulo.split(" ");
  const mitad = Math.floor(palabras.length / 2);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-10 flex flex-col items-center gap-5 text-center">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.04] font-extrabold tracking-[-0.03em] text-balance">
          <span className="text-tinta-2/60">{palabras.slice(0, mitad).join(" ")}</span> <span>{palabras.slice(mitad).join(" ")}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-pretty text-tinta-2">{texto}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {preguntas.map((q, i) => (
          <Item key={q.p} pregunta={q} indice={i} />
        ))}
      </ul>
    </div>
  );
}

function Item({ pregunta, indice }: { pregunta: Pregunta; indice: number }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  return (
    <li
      className={cn("rounded-tarjeta border border-tinta/12 px-4 py-1 transition-colors duration-200 motion-safe:animate-subir md:px-6", abierta ? "bg-papel-2/70" : "bg-papel")}
      style={{ animationDelay: `${indice * 80}ms` }}
    >
      <h3>
        <button
          aria-expanded={abierta}
          aria-controls={id}
          onClick={() => setAbierta((a) => !a)}
          className="flex w-full items-center justify-between gap-6 py-4 text-left text-base font-semibold md:text-lg"
        >
          {pregunta.p}
          <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-tinta/5 transition-transform duration-300", abierta && "rotate-45")}>
            +
          </span>
        </button>
      </h3>
      <div id={id} className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-calma)]", abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!abierta}>
          <p className="max-w-[60ch] pb-5 text-tinta-2">{pregunta.r}</p>
        </div>
      </div>
    </li>
  );
}
