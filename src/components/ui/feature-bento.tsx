import { cn } from "@/lib/cn";

/**
 * Adaptado de Marketing Feature Bento (isaiahbjork) en 21st.dev:
 * https://21st.dev/@isaiahbjork/components/marketing-feature-bento
 * Cada tarjeta lleva una ilustración pequeña que funciona; aquí se arman con piezas reales de Cuelga.
 * Sin framer-motion: las entradas y los hovers son CSS.
 */

export type VisualBento =
  | { tipo: "alertas"; alertas: { titulo: string; meta: string; tono?: "alerta" | "peligro" }[] }
  | { tipo: "gasto"; valor: string; leyenda: string; usado: number; tope: string }
  | { tipo: "codigo"; archivo: string; lineas: string[] }
  | { tipo: "propio"; nodo: React.ReactNode };

export type TarjetaBento = { id: string; titulo: string; texto: string; visual: VisualBento; tamano?: "sm" | "md" | "lg" | "full" };

const TAMANO: Record<NonNullable<TarjetaBento["tamano"]>, string> = {
  sm: "md:col-span-1 lg:col-span-2",
  md: "md:col-span-1 lg:col-span-3",
  lg: "md:col-span-2 lg:col-span-4",
  full: "md:col-span-2 lg:col-span-6",
};

export function FeatureBento({ tarjetas }: { tarjetas: TarjetaBento[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
      {tarjetas.map((t, i) => (
        <li key={t.id} className={cn(TAMANO[t.tamano ?? "sm"], "motion-safe:animate-subir")} style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}>
          <article className="group/tarjeta flex h-full flex-col overflow-hidden rounded-[22px] bg-papel-2/70 transition-colors duration-200 hover:bg-papel-2">
            <div aria-hidden="true" className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden px-5 pt-5">
              <Visual visual={t.visual} />
            </div>
            <div className="px-6 pt-5 pb-6">
              <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{t.titulo}</h3>
              <p className="mt-1.5 max-w-[48ch] text-[0.9375rem] leading-6 text-tinta-2">{t.texto}</p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function Visual({ visual }: { visual: VisualBento }) {
  switch (visual.tipo) {
    case "alertas":
      return <Alertas alertas={visual.alertas} />;
    case "gasto":
      return <Gasto {...visual} />;
    case "codigo":
      return <Codigo archivo={visual.archivo} lineas={visual.lineas} />;
    case "propio":
      return <>{visual.nodo}</>;
  }
}

/** La pila se abre al pasar el cursor, como en el original. */
function Alertas({ alertas }: { alertas: { titulo: string; meta: string; tono?: "alerta" | "peligro" }[] }) {
  const pila = alertas.slice(0, 3);
  return (
    <div className="relative h-[120px] w-full max-w-[320px]">
      {pila.map((a, i) => (
        <div
          key={a.titulo}
          className="absolute inset-x-0 top-0 rounded-[14px] bg-noche p-3 text-papel shadow-equipo transition-transform duration-300 ease-[var(--ease-calma)] [transform:translateY(calc(var(--prof)*14px))_scale(calc(1-var(--prof)*0.06))] group-hover/tarjeta:[transform:translateY(calc(var(--prof)*42px))_scale(calc(1-var(--prof)*0.03))]"
          style={{ zIndex: pila.length - i, opacity: 1 - i * 0.18, ["--prof" as string]: i }}
        >
          <div className={cn("flex items-start gap-2.5", i > 0 && "opacity-0 transition-opacity duration-300 group-hover/tarjeta:opacity-100")}>
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", a.tono === "peligro" ? "bg-peligro" : "bg-alerta")} />
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-semibold">{a.titulo}</span>
              <span className="block truncate text-[0.6875rem] text-papel/50">{a.meta}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Gasto({ valor, leyenda, usado, tope }: { valor: string; leyenda: string; usado: number; tope: string }) {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-4">
      <div>
        <p className="font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums">{valor}</p>
        <p className="mt-1.5 text-xs text-tinta-2">{leyenda}</p>
      </div>
      <div>
        <div className="h-3 overflow-hidden rounded-full bg-tinta/10">
          <div className="h-full rounded-full bg-tinta" style={{ width: `${Math.max(2, usado * 100)}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between text-xs text-tinta-2 tabular-nums">
          <span>$0</span>
          <span>tope {tope}</span>
        </p>
      </div>
    </div>
  );
}

function Codigo({ archivo, lineas }: { archivo: string; lineas: string[] }) {
  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-[14px] bg-noche text-papel">
      <div className="flex items-center justify-between border-b border-borde px-3 py-2">
        <span className="font-mono text-[0.6875rem] text-papel/50">{archivo}</span>
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-papel/20" />
          <span className="size-1.5 rounded-full bg-papel/20" />
        </span>
      </div>
      <pre className="overflow-hidden px-3 py-3 font-mono text-[0.6875rem] leading-[1.7] text-papel/80">
        {lineas.map((l, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-3 text-right text-papel/25 tabular-nums select-none">{i + 1}</span>
            <span className="whitespace-pre">
              {l.split(/("[^"]*")/g).map((parte, j) =>
                parte.startsWith('"') ? (
                  <span key={j} className="text-senal">
                    {parte}
                  </span>
                ) : (
                  <span key={j}>{parte}</span>
                ),
              )}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}
