import { cn } from "@/lib/cn";

/** Adaptado de Hero Pill (originui) en 21st.dev: https://21st.dev/@originui/components/hero-pill */
export function HeroPill({ icono, texto, className }: { icono?: React.ReactNode; texto: string; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-noche-3 px-3 py-1 text-sm font-medium text-papel motion-safe:animate-subir",
        className,
      )}
    >
      {icono && <span className="mr-2 flex shrink-0 border-r border-papel/20 pr-2">{icono}</span>}
      {texto}
    </p>
  );
}
