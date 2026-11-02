import Link from "next/link";

/** Un auricular dibujado como una C gruesa, con las bocinas hacia dentro, y el punto verde de "está bien" en la abertura. */
const CENTRO = { x: 27, y: 32 };
const RADIO = 17;
const ANGULO = 52; // grados desde el eje horizontal hasta cada bocina

const en = (signo: 1 | -1, radio: number) => {
  const a = (signo * ANGULO * Math.PI) / 180;
  return { x: +(CENTRO.x + radio * Math.cos(a)).toFixed(2), y: +(CENTRO.y + radio * Math.sin(a)).toFixed(2), grados: signo * ANGULO };
};
const arriba = en(-1, RADIO);
const abajo = en(1, RADIO);
const ARCO = `M ${arriba.x} ${arriba.y} A ${RADIO} ${RADIO} 0 1 0 ${abajo.x} ${abajo.y}`;
const BOCINAS = [en(-1, RADIO - 3), en(1, RADIO - 3)];

export function Marca({ className = "size-8", tono = "tinta" }: { className?: string; tono?: "tinta" | "papel" }) {
  const trazo = tono === "tinta" ? "var(--color-tinta)" : "var(--color-papel)";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={ARCO} fill="none" stroke={trazo} strokeWidth={9} />
      {BOCINAS.map((p) => (
        <rect key={p.grados} x={p.x - 9} y={p.y - 6} width={18} height={12} rx={5} fill={trazo} transform={`rotate(${p.grados} ${p.x} ${p.y})`} />
      ))}
      <circle cx={46} cy={32} r={6} fill="var(--color-senal)" />
    </svg>
  );
}

export function Logo({ tono = "tinta", className = "" }: { tono?: "tinta" | "papel"; className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Cuelga, inicio">
      <Marca tono={tono} className="size-8" />
      <span className={`font-display text-2xl font-extrabold tracking-[-0.04em] ${tono === "tinta" ? "text-tinta" : "text-papel"}`}>cuelga</span>
    </Link>
  );
}
