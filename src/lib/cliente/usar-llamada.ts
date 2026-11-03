import { useEffect, useRef, useState } from "react";
import guionEjemplo from "../../../data/guiones/sv-01-nieta-llorando.json";
import type { ConfigLlamada, VistaEscucha } from "../llamada";
import { desdeArchivo, desdeMicrofono, Emisor, type Fuente } from "./audio";
import type { Familia } from "./familia";

export type Modo = "mic" | "archivo" | "guion";

function configDe(f: Familia): ConfigLlamada {
  return { canal: f.canal, quienEscucha: f.quienEscucha, protegido: f.protegido, respaldo: f.respaldo, esperaSeg: f.esperaSeg, suscripciones: f.suscripciones };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Una llamada desde la pantalla de casa: la empieza, le manda audio o el guion, consulta su estado y la cuelga. */
export function useLlamada(familia: Familia | null) {
  const [vista, setVista] = useState<VistaEscucha | null>(null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [activa, setActiva] = useState(false);
  const [enviando, setEnviando] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string | null>(null);
  const colgadaRef = useRef<string | null>(null);
  const fuenteRef = useRef<Fuente | null>(null);
  const emisorRef = useRef<Emisor | null>(null);
  const guionRef = useRef<{ cancelado: boolean } | null>(null);

  const id = vista?.id;
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    const t = setInterval(async () => {
      const r = await fetch(`/api/llamadas/${id}`, { cache: "no-store" }).catch(() => null);
      if (!vivo || !r?.ok) return;
      const v = (await r.json()) as VistaEscucha;
      if (vivo && idRef.current === id) setVista(v);
    }, 1000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [id]);

  async function colgar(llamada = idRef.current) {
    if (!llamada || colgadaRef.current === llamada) return;
    colgadaRef.current = llamada;
    fuenteRef.current?.detener();
    fuenteRef.current = null;
    if (guionRef.current) guionRef.current.cancelado = true;
    setActiva(false);
    await emisorRef.current?.cerrar();
    emisorRef.current = null;
    const r = await fetch(`/api/llamadas/${llamada}/fin`, { method: "POST" }).catch(() => null);
    if (r?.ok && idRef.current === llamada) setVista((await r.json()) as VistaEscucha);
  }

  async function correrGuion(llamada: string) {
    const control = { cancelado: false };
    guionRef.current = control;
    for (const t of guionEjemplo.turnos) {
      await dormir(3_500);
      if (control.cancelado) return;
      const r = await fetch(`/api/llamadas/${llamada}/turno`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hablante: t.hablante === "llamante" ? "llamante" : "receptor", texto: t.texto }),
      }).catch(() => null);
      if (r?.ok && idRef.current === llamada) setVista((await r.json()) as VistaEscucha);
    }
  }

  async function empezar(m: Modo, archivo?: File) {
    if (!familia) return;
    setError(null);
    const r = await fetch("/api/llamadas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(configDe(familia)),
    }).catch(() => null);
    if (!r?.ok) {
      setError("No se pudo empezar. Revisa la conexión.");
      return;
    }
    const { vista: v, puedeEscuchar } = (await r.json()) as { vista: VistaEscucha; puedeEscuchar: boolean };
    if (m !== "guion" && !puedeEscuchar) {
      setError("Este servidor no tiene un modelo para escuchar audio. Prueba con la llamada de ejemplo.");
      return;
    }
    idRef.current = v.id;
    setVista(v);
    setModo(m);
    setActiva(true);
    if (m === "guion") {
      void correrGuion(v.id);
      return;
    }

    const emisor = new Emisor(async (wav) => {
      setEnviando((n) => n + 1);
      try {
        const res = await fetch(`/api/llamadas/${v.id}/audio`, { method: "POST", headers: { "content-type": "audio/wav" }, body: wav });
        if (res.ok && idRef.current === v.id) setVista((await res.json()) as VistaEscucha);
        else if (!res.ok) setError("Un trozo de audio no se pudo escuchar. Seguimos con el siguiente.");
      } finally {
        setEnviando((n) => n - 1);
      }
    });
    emisorRef.current = emisor;
    try {
      const fuente = m === "mic" ? await desdeMicrofono((x) => emisor.empujar(x)) : await desdeArchivo(archivo!, (x) => emisor.empujar(x));
      fuenteRef.current = fuente;
      void fuente.terminada.then(() => colgar(v.id));
    } catch {
      setError(m === "mic" ? "No hay permiso para usar el micrófono." : "No se pudo leer ese audio.");
      void colgar(v.id);
    }
  }

  function nueva() {
    idRef.current = null;
    setVista(null);
    setModo(null);
    setError(null);
  }

  return { vista, modo, activa, enviando, error, empezar, colgar, nueva };
}
