import Link from "next/link";
import { Barra } from "@/components/barra";

export default function NoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-tinta">
      <Barra />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-6 px-4 pb-24 sm:px-6">
        <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-tinta-2 uppercase">Error 404</p>
        <h1 className="max-w-2xl font-display text-[clamp(2.75rem,1.6rem+4.6vw,5.25rem)] leading-[0.95] font-extrabold tracking-[-0.035em]">Esta página colgó.</h1>
        <p className="max-w-md text-lg text-tinta-2">No existe o cambió de lugar. Si buscabas el enlace de un familiar, pídele a tu familia que te lo mande otra vez.</p>
        <Link href="/" className="self-start rounded-full bg-tinta px-6 py-4 font-semibold text-papel">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
