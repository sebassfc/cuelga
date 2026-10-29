export const ETAPAS = [
  "ninguna",
  "gancho",
  "aislamiento",
  "autoridad",
  "exigencia",
  "pago",
] as const;

export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_INFO: Record<Etapa, { orden: number; nombre: string; descripcion: string }> = {
  ninguna: { orden: 0, nombre: "Sin señales", descripcion: "Nada del guion de extorsión." },
  gancho: {
    orden: 1,
    nombre: "Gancho emocional",
    descripcion: "Voz que llora o pide ayuda, «¿no me reconoces?», «tenemos a tu hijo».",
  },
  aislamiento: {
    orden: 2,
    nombre: "Aislamiento",
    descripcion: "«No cuelgue», «no le diga a nadie», mantener a la víctima en la línea.",
  },
  autoridad: {
    orden: 3,
    nombre: "Falsa autoridad",
    descripcion: "Se presentan como comandante, grupo criminal o policía; dicen que la vigilan.",
  },
  exigencia: {
    orden: 4,
    nombre: "Exigencia",
    descripcion: "Piden dinero o un rescate, preguntan cuánto tiene, amenazan.",
  },
  pago: {
    orden: 5,
    nombre: "Instrucciones de pago",
    descripcion: "Depósito, transferencia, OXXO, CLABE, tarjetas de regalo.",
  },
};

/** Etapas que por sí solas justifican verificar al familiar. */
export const ETAPAS_DE_ALERTA: ReadonlySet<Etapa> = new Set(["aislamiento", "autoridad", "exigencia"]);

export type Nivel = 0 | 1 | 2;

/** Minúsculas, sin acentos ni signos, espacios colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9$\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LEXICO: Record<Exclude<Etapa, "ninguna">, RegExp[]> = {
  gancho: [
    /\b(ma|mama|mami|pa|papa|papi|abuela|abuelo|abue|tia|tio)\b.{0,25}\b(ayudame|ayuda|auxilio|sacame)\b/,
    /\b(ayudame|auxilio|sacame de aqui)\b/,
    /\b(me|nos) (tienen|agarraron|levantaron|secuestraron)\b/,
    /\btenemos a (tu|su)\b/,
    /\b(lo|la|los|las) tenemos\b/,
    /\bsecuestr/,
    /\bno me reconoces?\b/,
    /\badivin[ae] quien (soy|habla)\b/,
  ],
  aislamiento: [
    /\bno (cuelgue|cuelgues|cuelga|vaya a colgar|vayas a colgar)\b/,
    /\bsi (cuelga|cuelgas)\b/,
    /\bno (le )?(diga|digas|avise|avises|hable|hables|cuente|cuentes)\b.{0,20}\b(nadie|policia|familia)\b/,
    /\bno (llame|llames|marque|marques) a\b/,
    /\b(mantengase|quedese|quedate|siga|sigue) en la linea\b/,
    /\b(apague|apaga)\b.{0,15}\b(celular|telefono)\b/,
    /\bnadie (debe|puede|tiene que) saber\b/,
  ],
  autoridad: [
    /\bcomandante\b/,
    /\bcartel\b/,
    /\bsomos (de|del|de la)\b.{0,15}\b(cartel|grupo|organizacion|empresa|plaza)\b/,
    /\b(policia|agente|ministerial|fiscalia|guardia nacional|migracion)\b/,
    /\bsabemos (donde|quien|todo)\b/,
    /\b(lo|la|te|le|los) (estamos|tenemos) (viendo|vigilando|checando)\b/,
  ],
  exigencia: [
    /\b(quiero|queremos|necesito|necesitamos|ocupo|ocupamos|exigimos)\b.{0,30}\b(dinero|lana|feria|pesos|dolares|mil|\d)/,
    /\brescate\b/,
    /\bcuanto (tiene|tienes|dinero)\b/,
    /\b(si no|o si no)\b.{0,40}\b(paga|pagas|deposita|depositas|junta|juntas)\b/,
    /\b(le|te) va a (pasar|ir) (algo|mal)\b/,
  ],
  pago: [
    /\boxxo\b/,
    /\bdeposit/,
    /\btransfer/,
    /\bclabe\b/,
    /\bspei\b/,
    /\bnumero de (cuenta|tarjeta)\b/,
    /\btarjetas? de (regalo|saldo)\b/,
    /\brecargas?\b/,
    /\b(western union|elektra)\b/,
  ],
};

export type AciertoLexico = { etapa: Exclude<Etapa, "ninguna">; fragmento: string };

export type ResultadoLexico = {
  /** Etapa de mayor orden encontrada en el texto. */
  etapa: Etapa;
  aciertos: AciertoLexico[];
};

export function escanearLexico(texto: string): ResultadoLexico {
  const norm = normalizar(texto);
  const aciertos: AciertoLexico[] = [];
  for (const etapa of Object.keys(LEXICO) as Exclude<Etapa, "ninguna">[]) {
    for (const patron of LEXICO[etapa]) {
      const m = norm.match(patron);
      if (m) {
        aciertos.push({ etapa, fragmento: m[0] });
        break;
      }
    }
  }
  return { etapa: etapaMayor(aciertos.map((a) => a.etapa)), aciertos };
}

export function etapaMayor(etapas: Iterable<Etapa>): Etapa {
  let mayor: Etapa = "ninguna";
  for (const e of etapas) if (ETAPA_INFO[e].orden > ETAPA_INFO[mayor].orden) mayor = e;
  return mayor;
}

/**
 * Nivel de riesgo a partir de las etapas vistas en toda la llamada.
 * 2 = verificar al familiar ya: una etapa de alerta, o dos etapas distintas.
 * 1 = atención: una sola etapa ambigua (gancho o pago, que también aparecen en llamadas normales).
 */
export function nivelPorEtapas(vistas: ReadonlySet<Etapa>): Nivel {
  const reales = [...vistas].filter((e) => e !== "ninguna");
  if (reales.some((e) => ETAPAS_DE_ALERTA.has(e)) || new Set(reales).size >= 2) return 2;
  return reales.length > 0 ? 1 : 0;
}
