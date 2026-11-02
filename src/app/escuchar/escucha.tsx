"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Barra } from "@/components/barra";
import { EstadoLlamada, Metricas, PantallaASalvo, PistaEtapas, Transcripcion } from "@/components/llamada";
import { Marca } from "@/components/marca";
import { enlaceFamiliar, guardarFamilia, leerFamilia, nuevoCanal, type Familia } from "@/lib/cliente/familia";
import { useLlamada, type Modo } from "@/lib/cliente/usar-llamada";

export function Escucha() {
  // undefined = todavía no se lee localStorage (evita parpadeo y desajuste de hidratación)
  const [familia, setFamilia] = useState<Familia | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const f = leerFamilia();
    setFamilia(f);
    setEditando(!f);
  }, []);

  if (familia === undefined) return <main className="min-h-dvh bg-noche" />;
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

const enlaceDemo = (
  <Link href="/demo" className="rounded-full px-3 py-2 text-papel/70 hover:text-papel">
    Ver la demo
  </Link>
);

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
  const nombres = [protegido.trim(), respaldo.trim()].filter(Boolean);

  return (
    <main className="min-h-dvh bg-noche text-papel">
      <Barra claro={false} derecha={enlaceDemo} />
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 pt-6 pb-16">
        <header>
          <h1 className="font-display text-4xl leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-5xl">Configura Cuelga para tu familia.</h1>
          <p className="mt-3 text-lg text-papel/70">
            Se guarda solo en este dispositivo. ¿Solo quieres verlo funcionar?{" "}
            <Link href="/demo" className="font-semibold text-papel underline underline-offset-4">
              Mira la demo de 1 minuto
            </Link>
            .
          </p>
        </header>
        <form
          className="flex flex-col gap-4"
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
          <Bloque n={1} titulo="En casa">
            <Campo etiqueta="¿Quién contesta el teléfono?" ayuda="Así lo verán tus familiares en su teléfono.">
              <input className={entrada} value={quienEscucha} onChange={(e) => setQuienEscucha(e.target.value)} placeholder="Abuela Mari" maxLength={40} required />
            </Campo>
          </Bloque>
          <Bloque n={2} titulo="A quién protegemos">
            <Campo etiqueta="¿A quién podrían decir que tienen?" ayuda="A esta persona le preguntamos en silencio si está bien.">
              <input className={entrada} value={protegido} onChange={(e) => setProtegido(e.target.value)} placeholder="Ana" maxLength={40} required />
            </Campo>
            <Campo etiqueta="Segundo contacto (opcional)" ayuda="Si la primera persona no contesta, le preguntamos a esta.">
              <input className={entrada} value={respaldo} onChange={(e) => setRespaldo(e.target.value)} placeholder="Lucía, mamá de Ana" maxLength={40} />
            </Campo>
          </Bloque>
          <Bloque n={3} titulo="Cuánto esperamos cada respuesta">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Espera por respuesta">
              {[20, 30, 60].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={esperaSeg === s}
                  onClick={() => setEsperaSeg(s)}
                  className={`rounded-full py-3 font-semibold tabular-nums ${esperaSeg === s ? "bg-papel text-tinta" : "bg-noche-3 text-papel/70"}`}
                >
                  {s} s
                </button>
              ))}
            </div>
          </Bloque>
          <label className="flex cursor-pointer items-start gap-3 rounded-tarjeta border border-borde p-4">
            <input type="checkbox" className="mt-1 size-5 accent-senal" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            <span className="text-papel/85">
              {nombres.length ? nombres.join(" y ") : "Mis familiares"} {nombres.length > 1 ? "saben" : "sabe"} que Cuelga les puede preguntar si están bien, y están de acuerdo.
            </span>
          </label>
          <details className="text-sm text-papel/50">
            <summary className="cursor-pointer">Dirección para los teléfonos</summary>
            <input className={`${entrada} mt-2`} value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://…" />
            <p className="mt-1">Los enlaces de los familiares apuntan aquí. En una red local, usa la IP de esta computadora.</p>
          </details>
          <button type="submit" disabled={!valido} className="rounded-full bg-papel px-6 py-4 font-display text-xl font-extrabold text-tinta disabled:opacity-50">
            Guardar y conectar teléfonos
          </button>
        </form>
      </div>
    </main>
  );
}

const entrada = "w-full rounded-xl border border-borde bg-noche px-4 py-3 text-lg text-papel placeholder:text-papel/30 outline-none focus:border-papel/60";

function Bloque({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-tarjeta bg-noche-2 p-5">
      <legend className="sr-only">{titulo}</legend>
      <p className="flex items-center gap-3 font-semibold" aria-hidden="true">
        <span className="grid size-7 place-items-center rounded-full bg-papel text-sm font-bold text-tinta tabular-nums">{n}</span>
        {titulo}
      </p>
      {children}
    </fieldset>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-papel/85">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-sm text-papel/45">{ayuda}</span>}
    </label>
  );
}

// --- panel de escucha ---

function Panel({ familia, alEditar }: { familia: Familia; alEditar: () => void }) {
  const { vista, modo, activa, enviando, error, empezar, colgar, nueva } = useLlamada(familia);
  const [verdeOculto, setVerdeOculto] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  function iniciar(m: Modo, archivo?: File) {
    setVerdeOculto(false);
    void empezar(m, archivo);
  }

  return (
    <main className="min-h-dvh bg-noche text-papel">
      <Barra claro={false} derecha={enlaceDemo} />
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-2 pb-10">
        <div className="flex items-center justify-between gap-4 rounded-full bg-noche-2 py-2 pr-2 pl-4">
          <p className="truncate text-papel/80">
            Protegiendo a <strong className="text-papel">{familia.protegido}</strong>
            {familia.respaldo ? ` · respaldo: ${familia.respaldo}` : ""}
          </p>
          {!activa && (
            <button onClick={alEditar} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-papel/60 hover:bg-noche-3 hover:text-papel">
              Cambiar
            </button>
          )}
        </div>

        {vista ? (
          <section className="flex flex-col gap-4">
            <EstadoLlamada
              vista={vista}
              protegido={familia.protegido}
              respaldo={familia.respaldo}
              esperaSeg={familia.esperaSeg}
              activa={activa}
              textoInactivo={modo === "mic" ? "Escuchando. Pon la llamada en altavoz cerca de este dispositivo." : "Escuchando la llamada…"}
            />
            <PistaEtapas etapas={vista.etapas} />
            <Transcripcion turnos={vista.turnos} />
            <Metricas vista={vista} enviando={enviando} />
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            <button onClick={() => iniciar("mic")} className="group flex flex-col items-center gap-4 rounded-equipo bg-papel px-6 py-10 text-center text-tinta">
              <span className="relative grid size-20 place-items-center" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-tinta/10 motion-safe:group-hover:animate-latir" />
                <span className="grid size-16 place-items-center rounded-full bg-tinta">
                  <Marca tono="papel" className="size-10" />
                </span>
              </span>
              <span className="font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">Escuchar una llamada</span>
              <span className="max-w-sm text-tinta-2">Cuando entre una llamada sospechosa, pon el altavoz y deja el teléfono junto a esta pantalla.</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => archivoRef.current?.click()} className="rounded-tarjeta bg-noche-2 px-4 py-4 text-left hover:bg-noche-3">
                <span className="block font-semibold">Usar un audio grabado</span>
                <span className="block text-sm text-papel/50">Cualquier archivo de audio</span>
              </button>
              <button onClick={() => iniciar("guion")} className="rounded-tarjeta bg-noche-2 px-4 py-4 text-left hover:bg-noche-3">
                <span className="block font-semibold">Ensayo con llamada de ejemplo</span>
                <span className="block text-sm text-papel/50">Guion escrito, sin audio</span>
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
                if (f) iniciar("archivo", f);
              }}
            />
          </section>
        )}

        {error && <p className="rounded-tarjeta border border-peligro bg-peligro/10 px-4 py-3">{error}</p>}

        {vista &&
          (activa ? (
            <button onClick={() => colgar()} className="rounded-full border border-papel/30 px-6 py-4 text-lg font-semibold">
              {modo === "archivo" ? "Detener audio" : "Ya colgué"}
            </button>
          ) : (
            <button onClick={nueva} className="rounded-full bg-papel px-6 py-4 text-lg font-semibold text-tinta">
              Nueva llamada
            </button>
          ))}

        {!activa && <Telefonos familia={familia} abierto={!vista} />}

        {vista?.fase === "a_salvo" && !verdeOculto && <PantallaASalvo nombre={familia.protegido} seg={vista.segASalvo} alCerrar={() => setVerdeOculto(true)} />}

        <footer className="mt-auto pt-6 text-sm text-papel/40">Cuelga nunca te dirá que pagues ni que negocies. Si alguien está en peligro, llama al 911.</footer>
      </div>
    </main>
  );
}

function Telefonos({ familia, abierto }: { familia: Familia; abierto: boolean }) {
  const contactos: { id: "protegido" | "respaldo"; nombre: string }[] = [{ id: "protegido", nombre: familia.protegido }];
  if (familia.respaldo) contactos.push({ id: "respaldo", nombre: familia.respaldo });
  return (
    <details open={abierto} className="rounded-equipo bg-noche-2 p-5">
      <summary className="cursor-pointer font-display text-xl font-bold">Conecta los teléfonos de la familia</summary>
      <p className="mt-2 text-papel/60">
        Cada familiar escanea su código una vez y deja la página abierta. Ahí le llega la pregunta, sin que suene una llamada.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
    <div className="flex flex-col items-center gap-3 rounded-tarjeta bg-noche-3 p-4">
      <p className="font-semibold">Teléfono de {nombre}</p>
      <div className="size-40 rounded-xl bg-papel p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(enlace).then(() => setCopiado(true));
          }}
          className="rounded-full bg-noche-2 px-3 py-1.5 font-medium"
        >
          {copiado ? "Copiado" : "Copiar enlace"}
        </button>
        <a href={enlace} target="_blank" rel="noreferrer" className="rounded-full bg-noche-2 px-3 py-1.5 font-medium">
          Abrir aquí
        </a>
      </div>
    </div>
  );
}
