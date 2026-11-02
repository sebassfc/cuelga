"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import guionEjemplo from "../../../data/guiones/sv-01-nieta-llorando.json";
import { desdeArchivo, desdeMicrofono, Emisor, type Fuente } from "@/lib/cliente/audio";
import { enlaceFamiliar, guardarFamilia, leerFamilia, nuevoCanal, type Familia } from "@/lib/cliente/familia";
import type { ConfigLlamada, TurnoVista, VistaEscucha } from "@/lib/llamada";
import type { Fase } from "@/lib/policy";
import { ETAPA_INFO, ETAPAS } from "@/lib/stages";

type Modo = "mic" | "archivo" | "guion";

export function Escucha() {
  // undefined = todavía no se lee localStorage (evita parpadeo y desajuste de hidratación)
  const [familia, setFamilia] = useState<Familia | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const f = leerFamilia();
    setFamilia(f);
    setEditando(!f);
  }, []);

  if (familia === undefined) return <main className="min-h-dvh" />;
  if (editando || !familia) {
    return (
      <ConfigFamilia
        inicial={familia}
        alGuardar={(f) => {
          guardarFamilia(f);
          setFamilia(f);
          setEditando(false);
        }}
      />
    );
  }
  return <Panel familia={familia} alEditar={() => setEditando(true)} />;
}

// --- configuración de la familia ---

function ConfigFamilia({ inicial, alGuardar }: { inicial: Familia | null; alGuardar: (f: Familia) => void }) {
  const [quienEscucha, setQuienEscucha] = useState(inicial?.quienEscucha ?? "");
  const [protegido, setProtegido] = useState(inicial?.protegido ?? "");
  const [respaldo, setRespaldo] = useState(inicial?.respaldo ?? "");
  const [esperaSeg, setEsperaSeg] = useState(inicial?.esperaSeg ?? 30);
  const [base, setBase] = useState(inicial?.base ?? "");
  const [acepta, setAcepta] = useState(Boolean(inicial));

  useEffect(() => {
    if (base) return;
    const { hostname, port, protocol, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      setBase(origin);
      return;
    }
    // En localhost los teléfonos no llegan: se propone la IP de la Mac en la red.
    fetch("/api/red")
      .then((r) => r.json() as Promise<{ ips: string[] }>)
      .then(({ ips }) => setBase(ips[0] ? `${protocol}//${ips[0]}${port ? `:${port}` : ""}` : origin))
      .catch(() => setBase(origin));
  }, [base]);

  const valido = quienEscucha.trim() && protegido.trim() && acepta && base;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">Cuelga</p>
        <h1 className="mt-1 text-3xl font-bold">Configura a tu familia</h1>
        <p className="mt-2 text-zinc-400">Se guarda solo en este dispositivo. Toma un minuto y se hace una vez.</p>
      </header>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valido) return;
          alGuardar({
            canal: inicial?.canal ?? nuevoCanal(),
            quienEscucha: quienEscucha.trim(),
            protegido: protegido.trim(),
            respaldo: respaldo.trim() || null,
            esperaSeg,
            base: base.trim(),
          });
        }}
      >
        <Campo etiqueta="¿Quién contesta en casa?" ayuda="Así lo verán tus familiares en su teléfono.">
          <input className={entrada} value={quienEscucha} onChange={(e) => setQuienEscucha(e.target.value)} placeholder="Abuela Mari" maxLength={40} required />
        </Campo>
        <Campo etiqueta="¿A quién podrían decir que tienen?" ayuda="A esta persona le preguntaremos en silencio si está bien.">
          <input className={entrada} value={protegido} onChange={(e) => setProtegido(e.target.value)} placeholder="Ana" maxLength={40} required />
        </Campo>
        <Campo etiqueta="Segundo contacto (opcional)" ayuda="Si la primera persona no contesta, le preguntamos a esta.">
          <input className={entrada} value={respaldo} onChange={(e) => setRespaldo(e.target.value)} placeholder="Lucía, mamá de Ana" maxLength={40} />
        </Campo>
        <Campo etiqueta="¿Cuánto esperar cada respuesta?">
          <select className={entrada} value={esperaSeg} onChange={(e) => setEsperaSeg(Number(e.target.value))}>
            <option value={20}>20 segundos</option>
            <option value={30}>30 segundos</option>
            <option value={60}>60 segundos</option>
          </select>
        </Campo>
        <label className="flex items-start gap-3 rounded-xl border border-zinc-700 p-4">
          <input type="checkbox" className="mt-1 size-5" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>
            {protegido.trim() || "Tus familiares"}
            {respaldo.trim() ? ` y ${respaldo.trim()}` : ""} saben que Cuelga les puede preguntar si están bien, y están de acuerdo.
          </span>
        </label>
        <details className="text-sm text-zinc-400">
          <summary className="cursor-pointer">Dirección para los teléfonos</summary>
          <input className={`${entrada} mt-2`} value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://…" />
          <p className="mt-1">Los enlaces de los familiares apuntan aquí. En una red local, usa la IP de esta computadora.</p>
        </details>
        <button type="submit" disabled={!valido} className="rounded-2xl bg-white px-6 py-4 text-lg font-bold text-black disabled:opacity-40">
          Guardar
        </button>
      </form>
    </main>
  );
}

const entrada = "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg outline-none focus:border-zinc-300";

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-sm text-zinc-400">{ayuda}</span>}
    </label>
  );
}

// --- panel de escucha ---

function configDe(f: Familia): ConfigLlamada {
  return { canal: f.canal, quienEscucha: f.quienEscucha, protegido: f.protegido, respaldo: f.respaldo, esperaSeg: f.esperaSeg };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Panel({ familia, alEditar }: { familia: Familia; alEditar: () => void }) {
  const [vista, setVista] = useState<VistaEscucha | null>(null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [activa, setActiva] = useState(false);
  const [enviando, setEnviando] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verdeOculto, setVerdeOculto] = useState(false);
  const idRef = useRef<string | null>(null);
  const colgadaRef = useRef<string | null>(null);
  const fuenteRef = useRef<Fuente | null>(null);
  const emisorRef = useRef<Emisor | null>(null);
  const guionRef = useRef<{ cancelado: boolean } | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

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
    setError(null);
    setVerdeOculto(false);
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
      setError("Este servidor no tiene un modelo para escuchar audio. Prueba con el guion de ejemplo.");
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">Cuelga</p>
          <p className="text-zinc-300">
            Protegiendo a <strong>{familia.protegido}</strong>
            {familia.respaldo ? ` · respaldo: ${familia.respaldo}` : ""}
          </p>
        </div>
        {!activa && (
          <button onClick={alEditar} className="text-sm text-zinc-400 underline">
            Cambiar
          </button>
        )}
      </header>

      {vista ? (
        <EnLlamada vista={vista} familia={familia} activa={activa} modo={modo} enviando={enviando} />
      ) : (
        <section className="flex flex-col gap-3">
          <button onClick={() => empezar("mic")} className="rounded-3xl bg-white px-6 py-8 text-2xl font-bold text-black">
            Escuchar llamada
            <span className="mt-1 block text-base font-normal text-zinc-600">Pon la llamada sospechosa en altavoz cerca de aquí</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => archivoRef.current?.click()} className="rounded-2xl border border-zinc-700 px-4 py-4 font-semibold">
              Usar un audio grabado
            </button>
            <button onClick={() => empezar("guion")} className="rounded-2xl border border-zinc-700 px-4 py-4 font-semibold">
              Guion de ejemplo
              <span className="block text-xs font-normal text-zinc-400">sintético, sin audio</span>
            </button>
          </div>
          <input
            ref={archivoRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void empezar("archivo", f);
            }}
          />
        </section>
      )}

      {error && <p className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-red-200">{error}</p>}

      {vista && (activa ? (
        <button onClick={() => colgar()} className="rounded-2xl border border-zinc-600 px-6 py-4 text-lg font-semibold">
          {modo === "archivo" ? "Detener audio" : "Ya colgué"}
        </button>
      ) : (
        <button onClick={nueva} className="rounded-2xl border border-zinc-600 px-6 py-4 text-lg font-semibold">
          Nueva llamada
        </button>
      ))}

      {!activa && <Telefonos familia={familia} abierto={!vista} />}

      {vista?.fase === "a_salvo" && !verdeOculto && (
        <button onClick={() => setVerdeOculto(true)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-green-500 p-6 text-center text-black">
          <span className="text-6xl leading-tight font-black sm:text-7xl">
            {familia.protegido} ESTÁ A SALVO.
            <br />
            CUELGA.
          </span>
          {vista.segASalvo !== null && (
            <span className="text-xl font-semibold">Confirmado {vista.segASalvo} s después de la primera frase del extorsionador.</span>
          )}
          <span className="text-sm underline">Toca para ver el detalle</span>
        </button>
      )}

      <footer className="mt-auto pt-6 text-sm text-zinc-500">Cuelga nunca te dirá que pagues ni que negocies. Si alguien está en peligro, llama al 911.</footer>
    </main>
  );
}

const ESTILO_FASE: Record<Fase, string> = {
  escuchando: "border-zinc-700 bg-zinc-900",
  atencion: "border-amber-500 bg-amber-950",
  verificando: "border-orange-500 bg-orange-950",
  segundo_contacto: "border-orange-500 bg-orange-950",
  sin_respuesta: "border-red-500 bg-red-950",
  a_salvo: "border-green-400 bg-green-950",
  pidio_ayuda: "border-red-400 bg-red-800",
};

function EnLlamada({ vista, familia, activa, modo, enviando }: { vista: VistaEscucha; familia: Familia; activa: boolean; modo: Modo | null; enviando: number }) {
  const texto =
    vista.mensaje?.texto ??
    (activa ? (modo === "mic" ? "Escuchando. Pon la llamada en altavoz cerca de este dispositivo." : "Escuchando la llamada…") : "Llamada terminada.");
  const siguiente = familia.respaldo ? `preguntamos a ${familia.respaldo}` : "te diremos que cuelgues y llames al 089";

  return (
    <section className="flex flex-col gap-4">
      <div className={`rounded-3xl border-2 p-6 ${ESTILO_FASE[vista.fase]}`} aria-live="assertive">
        <p className="text-3xl leading-snug font-bold">{texto}</p>
        {vista.preguntas.map((p) => (
          <p key={p.nombre} className="mt-3 text-lg">
            {p.estaBien === true
              ? `✓ ${p.nombre} respondió que está bien`
              : p.estaBien === false
                ? `✗ ${p.nombre} respondió que NO está bien`
                : `Preguntando en silencio a ${p.nombre}… ${p.esperandoSeg ?? 0} s`}
          </p>
        ))}
        {vista.escalaEnSeg !== null && vista.fase === "verificando" && (
          <p className="mt-1 text-zinc-300">
            Si {familia.protegido} no contesta en {vista.escalaEnSeg} s, {siguiente}.
          </p>
        )}
        {vista.escalaEnSeg !== null && vista.fase === "segundo_contacto" && (
          <p className="mt-1 text-zinc-300">Si nadie contesta en {vista.escalaEnSeg} s: cuelga y llama al 089.</p>
        )}
        {vista.numero && (
          <a href={`tel:${vista.numero}`} className="mt-5 block rounded-2xl bg-white px-6 py-4 text-center text-2xl font-black text-black">
            Llamar al {vista.numero}
          </a>
        )}
      </div>

      <ol className="grid grid-cols-5 gap-1.5" aria-label="Etapas del guion de extorsión">
        {ETAPAS.filter((e) => e !== "ninguna").map((e) => {
          const vista_ = vista.etapas.includes(e);
          return (
            <li key={e} className={`rounded-lg px-2 py-2 text-center text-xs leading-tight ${vista_ ? "bg-orange-500 font-bold text-black" : "bg-zinc-900 text-zinc-500"}`}>
              {ETAPA_INFO[e].nombre}
            </li>
          );
        })}
      </ol>

      <Transcripcion turnos={vista.turnos} />

      <p className="text-sm text-zinc-500">
        {[
          vista.segAlerta !== null && `Alerta a los ${vista.segAlerta} s`,
          vista.segASalvo !== null && `a salvo a los ${vista.segASalvo} s`,
          vista.segLlamada !== null && `llamada: ${minutos(vista.segLlamada)}`,
          `gasto: $${vista.usd.toFixed(3)}`,
          enviando > 0 && "escuchando un trozo…",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {vista.avisos.map((a, i) => (
        <p key={i} className="text-sm text-amber-400">
          {a}
        </p>
      ))}
    </section>
  );
}

function minutos(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const FUENTE: Record<TurnoVista["fuente"], string> = { lexico: "léxico", modelo: "modelo", ambos: "léxico + modelo", pendiente: "revisando…" };

function Transcripcion({ turnos }: { turnos: TurnoVista[] }) {
  const fin = useRef<HTMLLIElement>(null);
  // Con llaves: en navegadores recientes scrollIntoView devuelve una promesa, y un efecto solo puede devolver su limpieza.
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest" });
  }, [turnos.length]);
  if (turnos.length === 0) return null;
  return (
    <details open className="rounded-2xl border border-zinc-800 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-400">Lo que se oye</summary>
      <ol className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {turnos.map((t, i) => (
          <li key={i} ref={i === turnos.length - 1 ? fin : undefined} className="text-sm">
            <span className="font-semibold text-zinc-400">{t.hablante === "llamante" ? "Llamante" : t.hablante === "receptor" ? "En casa" : "Voz"}: </span>
            <span>{t.texto}</span>
            {t.etapa !== "ninguna" && <span className="ml-2 rounded bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-300">{ETAPA_INFO[t.etapa].nombre}</span>}
            <span className="ml-2 text-xs text-zinc-600">{FUENTE[t.fuente]}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Telefonos({ familia, abierto }: { familia: Familia; abierto: boolean }) {
  const contactos: { id: "protegido" | "respaldo"; nombre: string }[] = [{ id: "protegido", nombre: familia.protegido }];
  if (familia.respaldo) contactos.push({ id: "respaldo", nombre: familia.respaldo });
  return (
    <details open={abierto} className="rounded-2xl border border-zinc-800 p-4">
      <summary className="cursor-pointer font-semibold">Teléfonos de la familia</summary>
      <p className="mt-2 text-sm text-zinc-400">Cada familiar abre su enlace una vez y deja la página abierta. Ahí le llega la pregunta, sin que suene una llamada.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {contactos.map((c) => (
          <EnlaceTelefono key={c.id} nombre={c.nombre} enlace={enlaceFamiliar(familia, c.id)} />
        ))}
      </div>
    </details>
  );
}

function EnlaceTelefono({ nombre, enlace }: { nombre: string; enlace: string }) {
  const [svg, setSvg] = useState("");
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    QRCode.toString(enlace, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [enlace]);
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-zinc-900 p-4">
      <p className="font-semibold">Teléfono de {nombre}</p>
      <div className="size-40 rounded-lg bg-white p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex gap-3 text-sm">
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(enlace).then(() => setCopiado(true));
          }}
          className="underline"
        >
          {copiado ? "Copiado" : "Copiar enlace"}
        </button>
        <a href={enlace} target="_blank" rel="noreferrer" className="underline">
          Abrir aquí
        </a>
      </div>
    </div>
  );
}
