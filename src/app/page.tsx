import { ETAPAS, ETAPA_INFO } from "@/lib/stages";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-10">
      <h1 className="text-4xl font-bold">Cuelga</h1>
      <p className="text-lg">Mientras el extorsionador habla, Cuelga confirma en silencio que tu familiar está a salvo.</p>
      <ol className="flex flex-col gap-2">
        {ETAPAS.filter((e) => e !== "ninguna").map((e) => (
          <li key={e} className="rounded-lg border border-zinc-700 p-3">
            <span className="font-semibold">{ETAPA_INFO[e].nombre}</span>
            <span className="block text-sm text-zinc-400">{ETAPA_INFO[e].descripcion}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
