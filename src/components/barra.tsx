import Link from "next/link";
import { Logo } from "./marca";

/** Barra superior. `claro` sobre papel (portada y demo), oscuro dentro del producto. */
export function Barra({ claro = true, derecha, fija = false }: { claro?: boolean; derecha?: React.ReactNode; fija?: boolean }) {
  const barra = (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Logo tono={claro ? "tinta" : "papel"} />
      <nav className="flex items-center gap-1 text-[0.9375rem] font-medium sm:gap-2">
        {derecha ?? (
          <>
            <Link href="/#como" className={`hidden rounded-full px-3 py-2 md:inline ${claro ? "text-tinta-2 hover:text-tinta" : "text-papel/70 hover:text-papel"}`}>
              Cómo funciona
            </Link>
            <Link href="/#preguntas" className={`hidden rounded-full px-3 py-2 md:inline ${claro ? "text-tinta-2 hover:text-tinta" : "text-papel/70 hover:text-papel"}`}>
              Preguntas
            </Link>
            <Link href="/escuchar" className={`hidden rounded-full px-4 py-2 font-semibold sm:inline ${claro ? "ring-1 ring-tinta/15 hover:ring-tinta/40" : "ring-1 ring-papel/25"}`}>
              Usar con mi familia
            </Link>
            <Link href="/demo" className={`rounded-full px-4 py-2 font-semibold ${claro ? "bg-tinta text-papel" : "bg-papel text-tinta"}`}>
              Probar la demo
            </Link>
          </>
        )}
      </nav>
    </header>
  );
  return fija ? <div className="sticky top-0 z-40 bg-papel">{barra}</div> : barra;
}
