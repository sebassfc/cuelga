import Link from "next/link";
import { ETAPAS, ETAPA_INFO } from "@/lib/stages";

const PASOS = [
  { titulo: "Escucha", texto: "La llamada va en altavoz. Un modelo abierto de Meta transcribe cada trozo y separa quién habla." },
  { titulo: "Reconoce el guion", texto: "Cada frase se compara con las etapas del secuestro virtual. El modelo solo cuenta si cita la frase exacta." },
  { titulo: "Verifica en silencio", texto: "Al primer «no cuelgue», el teléfono de tu familiar pregunta «¿estás bien?». La llamada sigue." },
  { titulo: "Te dice cuándo colgar", texto: "Si contesta que sí: «ESTÁ A SALVO. CUELGA.» Si nadie contesta, el segundo contacto y luego el 089." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">Cuelga</p>
        <h1 className="text-4xl leading-tight font-black sm:text-5xl">Mientras el extorsionador habla, Cuelga confirma en silencio que tu familiar está a salvo.</h1>
        <p className="text-lg text-zinc-300">
          El secuestro virtual funciona porque no puedes comprobar nada sin colgar. Cuelga lo comprueba por ti, durante la llamada, y nunca te dirá que pagues.
        </p>
        <Link href="/escuchar" className="mt-2 rounded-3xl bg-white px-6 py-5 text-center text-xl font-bold text-black">
          Abrir Cuelga
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {PASOS.map((p, i) => (
          <div key={p.titulo} className="rounded-2xl border border-zinc-800 p-5">
            <p className="text-sm text-zinc-500">{i + 1}</p>
            <h2 className="text-lg font-bold">{p.titulo}</h2>
            <p className="mt-1 text-zinc-400">{p.texto}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">Las etapas que reconoce</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {ETAPAS.filter((e) => e !== "ninguna").map((e) => (
            <li key={e} className="rounded-lg border border-zinc-800 p-3">
              <span className="font-semibold">{ETAPA_INFO[e].nombre}</span>
              <span className="block text-sm text-zinc-400">{ETAPA_INFO[e].descripcion}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="text-sm text-zinc-500">
        Hecho para el Meta Global AI Developer Hackathon con Muse Spark Open (open weights de Meta). Los guiones de ejemplo son sintéticos. Si alguien está en peligro, llama al 911.
      </footer>
    </main>
  );
}
