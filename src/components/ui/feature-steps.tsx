"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Adaptado de Feature Section (ayushmxxn) en 21st.dev: https://21st.dev/@ayushmxxn/components/feature-section
 * Pasos que avanzan solos con barra de progreso. Aquí cada paso muestra un estado real del producto en vez de una foto,
 * y las transiciones son CSS (sin framer-motion). Tocar un paso lo fija; con movimiento reducido no avanza solo.
 */
export type Paso = { titulo: string; texto: string; visual: React.ReactNode };

export function FeatureSteps({ pasos, intervalo = 4500 }: { pasos: Paso[]; intervalo?: number }) {
  // Paso y progreso juntos: un solo estado, así el avance no se duplica si React repite el cálculo.
  const [{ actual, progreso }, setEstado] = useState({ actual: 0, progreso: 0 });
  const [fijo, setFijo] = useState(false);
  const setActual = (i: number) => setEstado({ actual: i, progreso: 0 });

  useEffect(() => {
    if (fijo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setEstado((e) => (e.progreso < 100 ? { ...e, progreso: e.progreso + 100 / (intervalo / 100) } : { actual: (e.actual + 1) % pasos.length, progreso: 0 }));
    }, 100);
    return () => clearInterval(t);
  }, [fijo, intervalo, pasos.length]);

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
      <ol className="order-2 flex flex-col gap-2 md:order-1">
        {pasos.map((p, i) => (
          <li key={p.titulo}>
            <button
              onClick={() => {
                setActual(i);
                setFijo(true);
              }}
              aria-current={i === actual ? "step" : undefined}
              className={cn(
                "flex w-full gap-5 rounded-tarjeta p-4 text-left transition-[opacity,background-color] duration-500",
                i === actual ? "bg-papel opacity-100" : "opacity-45 hover:opacity-80",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full border-2 font-display font-bold tabular-nums transition-transform duration-500",
                  i === actual ? "scale-110 border-tinta bg-tinta text-papel" : i < actual ? "border-tinta/40 bg-tinta/5 text-tinta" : "border-tinta/25 text-tinta-2",
                )}
              >
                {i < actual ? "✓" : i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-extrabold tracking-[-0.02em] md:text-2xl">{p.titulo}</span>
                <span className="mt-1 block text-tinta-2">{p.texto}</span>
                {i === actual && (
                  <span className="mt-3 block h-1 overflow-hidden rounded-full bg-tinta/10">
                    <span className="block h-full rounded-full bg-tinta transition-[width] duration-100 ease-linear" style={{ width: `${fijo ? 100 : progreso}%` }} />
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="relative order-1 h-[320px] overflow-hidden rounded-equipo bg-noche md:order-2 md:h-[420px]" aria-live="polite">
        {pasos.map((p, i) => (
          <div
            key={p.titulo}
            aria-hidden={i !== actual}
            className={cn(
              "absolute inset-0 flex items-center justify-center p-6 transition-[opacity,transform] duration-500 ease-[var(--ease-calma)]",
              i === actual ? "translate-y-0 opacity-100" : i < actual ? "-translate-y-8 opacity-0" : "translate-y-8 opacity-0",
            )}
          >
            {p.visual}
          </div>
        ))}
      </div>
    </div>
  );
}
