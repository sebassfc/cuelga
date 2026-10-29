/** USD por millón de tokens. Fuente: dev.meta.ai/docs/pricing-rate-limits (29-oct-2026). */
export const PRECIOS_TOKENS: Record<string, { entrada: number; salida: number }> = {
  "muse-spark-1.3": { entrada: 1.25, salida: 4.25 },
  "muse-spark-1.2": { entrada: 1.25, salida: 4.25 },
  "muse-spark-1.3-contributor": { entrada: 0.1, salida: 0.2 },
  "muse-wonder-1.0": { entrada: 4, salida: 20 },
  // Open weights hospedados: precio aproximado de los proveedores; se usa solo para el tope.
  "muse-spark-open": { entrada: 1.25, salida: 4.25 },
  "muse-glimmer": { entrada: 0.35, salida: 1.5 },
};

/** USD por hora de audio procesado (Muse Voice Transcribe). */
export const PRECIO_VOZ_POR_HORA = 0.18;

/** Si el modelo no está en la tabla, se cobra como Wonder: el tope se equivoca hacia el lado seguro. */
function precioDe(modelo: string) {
  const exacto = PRECIOS_TOKENS[modelo];
  if (exacto) return exacto;
  const clave = Object.keys(PRECIOS_TOKENS).find((k) => modelo.includes(k));
  return clave ? PRECIOS_TOKENS[clave] : PRECIOS_TOKENS["muse-wonder-1.0"];
}

export function costoTokens(modelo: string, entrada: number, salida: number): number {
  const p = precioDe(modelo);
  return (entrada * p.entrada + salida * p.salida) / 1_000_000;
}

export function costoVoz(audioMs: number): number {
  return (Math.floor(audioMs / 1000) / 3600) * PRECIO_VOZ_POR_HORA;
}

/** Estimación pesimista de tokens de entrada a partir de caracteres (~3 caracteres por token en español). */
export function estimarTokens(caracteres: number): number {
  return Math.ceil(caracteres / 3);
}

export class TopeExcedido extends Error {
  constructor(
    readonly gastado: number,
    readonly pedido: number,
    readonly tope: number,
  ) {
    super(`Tope de gasto: gastado $${gastado.toFixed(4)} + estimado $${pedido.toFixed(4)} > tope $${tope.toFixed(2)}`);
    this.name = "TopeExcedido";
  }
}

/**
 * Presupuesto en USD. Antes de cada llamada se reserva el peor caso; después se registra el costo real.
 * Meta Model API no tiene un tope duro (el «spend limit» solo avisa), así que este es el tope.
 */
export class Presupuesto {
  private gastadoUsd = 0;
  private reservadoUsd = 0;
  readonly llamadas: { etiqueta: string; usd: number }[] = [];

  constructor(readonly topeUsd: number) {
    if (!(topeUsd > 0)) throw new Error("El tope debe ser mayor a 0");
  }

  get gastado() {
    return this.gastadoUsd;
  }

  reservar(usdEstimado: number): () => void {
    if (this.gastadoUsd + this.reservadoUsd + usdEstimado > this.topeUsd) {
      throw new TopeExcedido(this.gastadoUsd + this.reservadoUsd, usdEstimado, this.topeUsd);
    }
    this.reservadoUsd += usdEstimado;
    let liberada = false;
    return () => {
      if (liberada) return;
      liberada = true;
      this.reservadoUsd -= usdEstimado;
    };
  }

  registrar(etiqueta: string, usd: number) {
    this.gastadoUsd += usd;
    this.llamadas.push({ etiqueta, usd });
  }
}
