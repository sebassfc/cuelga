import { mensaje } from "@/lib/policy";
import { textoPregunta } from "@/lib/llamada";
import { ETAPA_INFO, ETAPAS } from "@/lib/stages";
import { Marca } from "./marca";

/** Miniaturas de la interfaz real para la portada. Los textos salen de los mismos catálogos que la app. */

const PREGUNTA = textoPregunta("esta_bien", { quienEscucha: "Abuela Mari", protegido: "Ana" });
const etiqueta = "text-[0.6875rem] font-semibold tracking-[0.14em] uppercase";

export function VisualEscucha() {
  return (
    <div className="w-full max-w-sm rounded-tarjeta border border-borde bg-noche-2 p-5 text-papel">
      <p className={`${etiqueta} flex items-center gap-2 text-papel/60`}>
        <span className="size-2 rounded-full bg-papel motion-safe:animate-latir" /> Escuchando
      </p>
      <div className="mt-5 flex h-16 items-center gap-1" aria-hidden="true">
        {[14, 30, 46, 22, 38, 54, 28, 18, 42, 26, 50, 20, 34, 16, 40, 24].map((h, i) => (
          <span key={i} className="flex-1 rounded-full bg-papel/70 motion-safe:animate-latir" style={{ height: h, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <p className="mt-5 text-sm text-papel/60">Llamante: «¡Abuelita, ayúdame, por favor! ¡Me tienen!»</p>
    </div>
  );
}

export function VisualGuion() {
  const oidas = new Set(["gancho", "aislamiento", "autoridad"]);
  return (
    <div className="w-full max-w-md text-papel">
      <ol className="grid grid-cols-5 gap-1.5">
        {ETAPAS.filter((e) => e !== "ninguna").map((e) => (
          <li key={e} className={`flex min-h-16 flex-col justify-between rounded-xl px-2 py-2 text-[0.6875rem] leading-tight ${oidas.has(e) ? "bg-alerta font-semibold text-tinta" : "bg-noche-3 text-papel/45"}`}>
            <span className="tabular-nums opacity-70">{ETAPA_INFO[e].orden}</span>
            {ETAPA_INFO[e].nombre}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-2">
        <Burbuja quien="Llamante" texto="Señora, cállese y escuche. No cuelgue y no le diga a nadie." etapa="Aislamiento" />
        <Burbuja quien="Llamante" texto="Habla el comandante. Sabemos dónde vive usted." etapa="Falsa autoridad" />
      </div>
    </div>
  );
}

export function VisualPregunta() {
  return (
    <div className="w-[210px] overflow-hidden rounded-[2rem] border-[7px] border-tinta bg-noche text-papel shadow-equipo">
      <div className="flex h-[360px] flex-col justify-center gap-3 p-4 ring-4 ring-alerta ring-inset">
        <span className="grid size-9 place-items-center rounded-full bg-alerta motion-safe:animate-timbre">
          <Marca tono="papel" className="size-6" />
        </span>
        <span className="font-display text-3xl leading-none font-extrabold tracking-[-0.03em]">{PREGUNTA.titulo}</span>
        <span className="text-xs leading-snug text-papel/70">{PREGUNTA.detalle}</span>
        <span className="rounded-full bg-senal py-2.5 text-center text-sm font-extrabold text-tinta">{PREGUNTA.si}</span>
        <span className="rounded-full bg-peligro py-2 text-center text-xs font-bold text-tinta">{PREGUNTA.no}</span>
      </div>
    </div>
  );
}

export function VisualASalvo() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-tarjeta bg-senal p-6 text-center text-tinta">
      <span className="font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.03em] sm:text-5xl">
        {mensaje("a_salvo", "Ana").replace(" CUELGA.", "")}
        <br />
        CUELGA.
      </span>
      <span className="text-sm font-semibold">Confirmado sin colgar.</span>
    </div>
  );
}

function Burbuja({ quien, texto, etapa }: { quien: string; texto: string; etapa: string }) {
  return (
    <div className="flex max-w-[92%] flex-col gap-1">
      <span className="text-[0.6875rem] text-papel/50">{quien}</span>
      <span className="rounded-2xl rounded-tl-md bg-noche-3 px-3 py-2 text-sm leading-snug">{texto}</span>
      <span className="self-start rounded-md bg-alerta/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-alerta">{etapa}</span>
    </div>
  );
}

/** Para el bento: la frase con la cita que el modelo tuvo que copiar tal cual. */
export function VisualCita() {
  return (
    <div className="w-full max-w-[560px] rounded-[14px] bg-noche p-4 text-papel">
      <p className={`${etiqueta} text-papel/45`}>Lo que se oye</p>
      <div className="mt-3 flex flex-col gap-2.5">
        <Linea quien="Llamante" etapa="Gancho emocional">
          ¡Abuelita, <Marcado>ayúdame</Marcado>, por favor! <Marcado>¡Me tienen!</Marcado>
        </Linea>
        <Linea quien="En casa">¿Ana? ¿Qué pasa, mija? ¿Dónde estás?</Linea>
        <Linea quien="Llamante" etapa="Aislamiento">
          Señora, cállese y escuche. <Marcado>No cuelgue y no le diga a nadie.</Marcado>
        </Linea>
      </div>
    </div>
  );
}

function Linea({ quien, etapa, children }: { quien: string; etapa?: string; children: React.ReactNode }) {
  return (
    <div className={`flex max-w-[90%] flex-col gap-1 ${quien === "En casa" ? "items-end self-end" : "self-start"}`}>
      <span className="text-[0.6875rem] text-papel/45">{quien}</span>
      <span className={`rounded-2xl px-3 py-2 text-sm leading-snug ${quien === "En casa" ? "rounded-tr-md bg-papel/10" : "rounded-tl-md bg-noche-3"}`}>{children}</span>
      {etapa && <span className="rounded-md bg-alerta/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-alerta">{etapa} · cita verificada</span>}
    </div>
  );
}

function Marcado({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-alerta/25 px-0.5 text-papel">{children}</mark>;
}

/** Para el bento: el catálogo cerrado, con los mensajes reales que puede mostrar la pantalla de casa. */
export function VisualCatalogo() {
  const claves = ["alerta", "sin_respuesta_primero", "sin_respuesta_final", "a_salvo"] as const;
  return (
    <div className="w-full max-w-[320px] rounded-[14px] bg-noche p-3 text-papel">
      <div className="mb-2 flex items-center justify-between">
        <span className={`${etiqueta} text-papel/45`}>Mensajes posibles</span>
        <span className="rounded-full bg-senal/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-senal">ninguno pide pagar</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {claves.map((c) => (
          <li key={c} className="truncate rounded-lg bg-noche-3 px-2.5 py-1.5 text-[0.75rem] text-papel/80">
            {mensaje(c, "Ana", "Lucía")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Para el bento: dónde vive cada dato. */
export function VisualPrivacidad() {
  const filas = [
    ["Voces y transcripciones", "no se guardan en disco"],
    ["Tu familia", "solo en este dispositivo"],
    ["El audio", "pasa por Baseten para transcribirse"],
  ];
  return (
    <ul className="flex w-full max-w-[360px] flex-col gap-2">
      {filas.map(([que, donde]) => (
        <li key={que} className="flex items-center justify-between gap-3 rounded-[12px] border border-tinta/10 bg-papel px-3 py-2.5">
          <span className="text-[0.8125rem] font-semibold">{que}</span>
          <span className="text-right text-[0.75rem] text-tinta-2">{donde}</span>
        </li>
      ))}
    </ul>
  );
}
