import Link from "next/link";
import { Barra } from "@/components/barra";
import { Escena } from "@/components/escena";
import { Logo } from "@/components/marca";
import { Faq } from "@/components/ui/faq";
import { FeatureBento } from "@/components/ui/feature-bento";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { HeroPill } from "@/components/ui/hero-pill";
import { VisualASalvo, VisualCatalogo, VisualCita, VisualEscucha, VisualGuion, VisualPregunta, VisualPrivacidad } from "@/components/visuales";

const titulo = "font-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance";

const PASOS = [
  { titulo: "Pones la llamada en altavoz", texto: "Cuelga escucha desde otro dispositivo. Muse Spark Open, el modelo abierto de Meta, transcribe y separa quién habla.", visual: <VisualEscucha /> },
  { titulo: "Reconoce el guion", texto: "Cada frase se compara con las cinco etapas del secuestro virtual. El modelo solo cuenta si cita la frase exacta.", visual: <VisualGuion /> },
  { titulo: "Pregunta en silencio", texto: "Al primer «no cuelgue», el teléfono de tu familiar pregunta «¿Estás bien?». La llamada sigue.", visual: <VisualPregunta /> },
  { titulo: "Te dice cuándo colgar", texto: "Si contesta que sí, la pantalla se pone verde. Si nadie contesta, el segundo contacto y luego el 089.", visual: <VisualASalvo /> },
];

const PREGUNTAS = [
  {
    p: "¿Cuelga graba mis llamadas?",
    r: "No. El audio pasa por Baseten para transcribirse, y lo que se oye vive solo en la memoria del servidor mientras dura la llamada. No se guardan voces ni transcripciones en disco. Los nombres de tu familia se quedan en tu dispositivo.",
  },
  {
    p: "¿Qué pasa si el modelo se equivoca?",
    r: "A veces oye frases que no se dijeron. Por diseño, un error solo puede provocar una pregunta silenciosa de más a tu familiar, nunca un consejo. Y un léxico del español de México corre siempre, aunque el modelo falle.",
  },
  {
    p: "¿Mi familiar tiene que instalar algo?",
    r: "No. Abre su enlace una vez y deja la página abierta; ahí le llega la pregunta. Todavía no hay notificaciones push, así que la página tiene que seguir abierta.",
  },
  {
    p: "¿Con qué llamadas se ha probado?",
    r: "Con ocho guiones sintéticos escritos para evaluar y con audio de voces sintéticas. La prueba con voces reales por altavoz todavía está pendiente. Los resultados medidos están en el repositorio.",
  },
  {
    p: "¿Cuánto cuesta?",
    r: "Es un prototipo del Meta Global AI Developer Hackathon y usarlo no cuesta. Cada llamada usa unos centavos de modelo; la llamada de ejemplo costó $0.013, y el código frena en $0.50 por llamada.",
  },
  {
    p: "¿Y si de verdad están en peligro?",
    r: "Si tu familiar contesta que NO está bien, Cuelga te dice que llames al 911. Si nadie confirma, te dice que cuelgues y llames al 089, la línea de denuncia anónima. Nunca te dirá que pagues ni que negocies.",
  },
];

export default function Home() {
  return (
    <main className="bg-papel text-tinta">
      <Barra fija />

      {/* 1. Hero: tarjeta con atmósfera y el producto saliendo por abajo */}
      <section className="px-2 sm:px-4">
        <div
          className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-noche px-4 pt-14 pb-56 text-center text-papel sm:pt-16 sm:pb-64"
          style={{
            backgroundImage:
              "radial-gradient(90% 60% at 50% 115%, rgb(31 209 122 / 0.45), transparent 70%), radial-gradient(60% 50% at 85% 10%, rgb(31 209 122 / 0.10), transparent 70%), linear-gradient(180deg, #0b0f0d 0%, #0e2219 60%, #123e2b 100%)",
          }}
        >
          <HeroPill icono={<span className="size-2 rounded-full bg-senal" />} texto="Meta Global AI Developer Hackathon 2026" />
          <h1 className="mx-auto mt-6 max-w-5xl font-display text-[clamp(2.5rem,1.4rem+3.6vw,4.25rem)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
            <span className="block motion-safe:animate-subir">Te dicen que la tienen.</span>
            <span className="block motion-safe:animate-subir motion-safe:[animation-delay:120ms]">
              Cuelga confirma que <span className="text-senal">está bien.</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-papel/85">
            Mientras el extorsionador habla, Cuelga escucha la llamada en altavoz y le pregunta en silencio a tu familiar si está bien. Si contesta que sí, cuelgas.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/demo" className="group inline-flex items-center gap-3 rounded-full bg-papel py-2 pr-6 pl-2 font-semibold text-tinta">
              <span className="grid size-10 place-items-center rounded-full bg-senal transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">
                ▶
              </span>
              Probar la demo · 1 min
            </Link>
            <Link href="/escuchar" className="rounded-full px-6 py-4 font-semibold text-papel ring-1 ring-papel/25 hover:ring-papel/60">
              Usar con mi familia
            </Link>
          </div>
          <p className="mt-5 text-sm text-papel/85">Funciona en el navegador · The demo has English subtitles</p>
        </div>
        <div className="relative z-10 mx-auto -mt-48 max-w-[680px] px-2 sm:-mt-56">
          <Escena />
        </div>
      </section>

      {/* 2. Construido con */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-tinta-2">Construido con</p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-display text-xl font-bold tracking-[-0.02em] text-tinta/55">
          <li>Muse Spark Open · Meta</li>
          <li>Baseten</li>
          <li>Next.js</li>
          <li>Render</li>
        </ul>
      </section>

      {/* 3. El problema */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16 lg:py-28">
        <p className="font-display text-[clamp(6rem,3rem+14vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.05em] tabular-nums">991</p>
        <div className="max-w-xl">
          <p className="font-display text-2xl leading-tight font-bold sm:text-3xl">víctimas de extorsión en Nuevo León en 2025.</p>
          <p className="mt-4 text-lg text-tinta-2">
            El secuestro virtual funciona porque no puedes comprobar nada sin colgar. Te mantienen en la línea, y la persona que dicen tener casi siempre está bien.
          </p>
          <p className="mt-4 text-sm text-tinta-2/80">Fuente: SESNSP, vía Grupo Animal.</p>
        </div>
      </section>

      {/* 4. Cómo funciona */}
      <section id="como" className="scroll-mt-20 bg-papel-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className={`${titulo} mb-12 max-w-2xl`}>Comprueba por ti, sin que cuelgues.</h2>
          <FeatureSteps pasos={PASOS} />
        </div>
      </section>

      {/* 5. Por qué confiar */}
      <section id="confianza" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
          <h2 className={titulo}>Diseñado para el peor momento.</h2>
          <p className="max-w-[46ch] text-lg text-tinta-2">Quien recibe la llamada está asustado. Por eso Cuelga no improvisa: cada mensaje sale de una lista cerrada y cada alerta necesita una prueba.</p>
        </div>
        <div className="mt-12">
          <FeatureBento
            tarjetas={[
              { id: "guion", tamano: "lg", titulo: "Reconoce el guion mientras pasa", texto: "Cada frase se etiqueta con su etapa. El modelo tiene que citar las palabras exactas de la llamada para que cuenten.", visual: { tipo: "propio", nodo: <VisualCita /> } },
              { id: "catalogo", tamano: "sm", titulo: "Nunca te dirá que pagues", texto: "Todo lo que ves sale de una lista cerrada. Una prueba revisa que ningún mensaje diga pagar ni negociar.", visual: { tipo: "propio", nodo: <VisualCatalogo /> } },
              {
                id: "escala",
                tamano: "sm",
                titulo: "Escala solo",
                texto: "Si tu familiar no contesta, pregunta al segundo contacto. Si nadie confirma, te manda al 089.",
                visual: {
                  tipo: "alertas",
                  alertas: [
                    { titulo: "Ana · ¿Estás bien?", meta: "preguntando en silencio" },
                    { titulo: "Lucía · ¿Sabes si Ana está bien?", meta: "si Ana no contesta" },
                    { titulo: "Cuelga y llama al 089", meta: "si nadie confirma", tono: "peligro" },
                  ],
                },
              },
              {
                id: "cita",
                tamano: "sm",
                titulo: "Solo cuenta la cita exacta",
                texto: "Si la evidencia del modelo no aparece tal cual en la llamada, se descarta.",
                visual: { tipo: "codigo", archivo: "salida del modelo · ejemplo", lineas: ["{", '  "etapa": "aislamiento",', '  "evidencia": "No cuelgue"', "}"] },
              },
              { id: "gasto", tamano: "md", titulo: "Gasto con tope en el código", texto: "Cada llamada reserva su peor costo antes de usar el modelo. Pasado el tope, solo sigue el léxico.", visual: { tipo: "gasto", valor: "$0.013", leyenda: "la llamada de ejemplo en la demo en línea, 2-nov-2026", usado: 0.013 / 0.5, tope: "$0.50" } },
              { id: "privado", tamano: "md", titulo: "Privado por diseño", texto: "Cuelga no necesita cuentas ni guarda lo que se dijo.", visual: { tipo: "propio", nodo: <VisualPrivacidad /> } },
            ]}
          />
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["2 s", "hasta la alerta, en la demo en línea"],
              ["18 s", "hasta «a salvo», misma prueba"],
              ["53", "pruebas automáticas pasan"],
              ["5", "etapas del guion que reconoce"],
            ].map(([cifra, texto]) => (
              <div key={texto} className="rounded-[22px] bg-tinta p-6 text-papel">
                <dt className="sr-only">{texto}</dt>
                <dd>
                  <span className="block font-display text-5xl leading-none font-extrabold tracking-[-0.04em] tabular-nums">{cifra}</span>
                  <span className="mt-2 block text-sm text-papel/60">{texto}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 6. Preguntas */}
      <section id="preguntas" className="scroll-mt-20 px-4 pb-20 sm:px-6 lg:pb-28">
        <Faq titulo="Lo que pregunta cada familia" texto="Lo que más nos preguntan antes de configurarlo. Los límites también están aquí." preguntas={PREGUNTAS} />
      </section>

      {/* 7. Cierre */}
      <section className="px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-12 rounded-[2rem] bg-noche px-4 py-20 text-papel sm:px-10 lg:py-24">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="font-display text-[clamp(2.75rem,1.6rem+4.6vw,5.25rem)] leading-[0.95] font-extrabold tracking-[-0.035em]">
              Pruébalo en
              <br />
              un minuto.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-full bg-papel px-7 py-4 font-display text-xl font-extrabold text-tinta">
                Probar la demo
              </Link>
              <Link href="/escuchar" className="rounded-full px-7 py-4 font-display text-xl font-extrabold ring-1 ring-papel/25 hover:ring-papel/60">
                Usar con mi familia
              </Link>
            </div>
          </div>
          <footer className="flex flex-col gap-4 border-t border-borde pt-8 text-sm text-papel/50 sm:flex-row sm:items-center sm:justify-between">
            <Logo tono="papel" />
            <p className="max-w-md">Hecho en Monterrey para el Meta Global AI Developer Hackathon 2026. Los guiones de ejemplo son sintéticos.</p>
            <a href="https://github.com/sebassfc/cuelga" className="underline underline-offset-4 hover:text-papel">
              Código en GitHub
            </a>
          </footer>
          <p className="-mt-6 text-sm text-papel/40">Si alguien está en peligro, llama al 911. Para denunciar una extorsión, al 089.</p>
        </div>
      </section>
    </main>
  );
}
