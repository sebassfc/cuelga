import type { ConfigLlamada } from "../llamada";

/**
 * La configuración de la familia vive solo en el dispositivo de casa (localStorage).
 * El servidor la recibe al empezar cada llamada y no la guarda más que la llamada.
 */
export type Familia = Omit<ConfigLlamada, "esperaSeg"> & { esperaSeg: number; base: string };

const CLAVE = "cuelga-familia-v1";

export function leerFamilia(): Familia | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Familia) : null;
  } catch {
    return null;
  }
}

export function guardarFamilia(f: Familia | null) {
  try {
    if (f) localStorage.setItem(CLAVE, JSON.stringify(f));
    else localStorage.removeItem(CLAVE);
  } catch {
    // modo privado: la configuración dura lo que dure la pestaña
  }
}

export function nuevoCanal(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function enlaceFamiliar(f: Familia, contacto: "protegido" | "respaldo"): string {
  const nombre = contacto === "protegido" ? f.protegido : (f.respaldo ?? "");
  const q = new URLSearchParams({ n: nombre, de: f.quienEscucha });
  return `${f.base.replace(/\/$/, "")}/familiar/${f.canal}/${contacto}?${q}`;
}
