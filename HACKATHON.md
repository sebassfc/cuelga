# HACKATHON.md: Cuelga en el Meta Global AI Developer Hackathon

Ficha completa y fuentes en `../HACKATHON.md`. La decisión y el ranking de ideas están en `../RECOMENDACION.md`.

| Dato | Valor |
|---|---|
| Track | Indie Developer (solo) |
| Tema | Build for Your World |
| **Cierre** | **mié 4-nov-2026, 20:00 Monterrey** (21:00 ET). Entrega completa antes del **mar 3-nov, 23:59** |
| Regla clave | Solo trabajo nuevo: todo este repo se escribió desde el 29-oct-2026, dentro del periodo de construcción (27-oct → 4-nov) |
| Repo | Debe ser público al entregar (todavía no se publica) |
| Video | ≤3 min, voz de Sebastián, con subtítulos |

## Modelos: decisión del 29-oct

Tu cuenta de dev.meta.ai está bloqueada por un chequeo de edad de Meta. El bot oficial de Cerebral Valley respondió que cuentan los modelos open-weight de Meta en cómputo propio o de los partners, sin penalización.

- **Ruta por defecto:** `CUELGA_PROVEEDOR=baseten`, con Muse Spark Open (`meta-models/muse-spark-open`; la guía decía `-1026`, pero Baseten no lo tiene) para escuchar audio y clasificar.
- **Si el ticket con Meta se resuelve:** `CUELGA_PROVEEDOR=meta` cambia a Muse Voice Transcribe + Muse Spark 1.3 sin tocar código.
- **Pendiente (tu parte):** abrir el ticket en dev.meta.ai/support y pedir créditos de Baseten y Modal.
- **Stretch:** Muse Glimmer como clasificador barato y siempre encendido (bono Open Weights de $10K).

## Criterio → evidencia

| Criterio (peso) | Qué lo demuestra en el repo | Estado |
|---|---|---|
| Impact (30%) | Problema medido: Nuevo León tuvo 991 víctimas de extorsión en 2025 (4º nacional, SESNSP vía Grupo Animal). Recreación con la familia de Sebastián | Falta la recreación |
| Uso de Meta (25%) | Spark Open **escucha** el audio y separa llamante/receptor con contexto entre trozos. El agente actúa **durante** la llamada | El oído está, falta probarlo con key |
| Profundidad (20%) | Léxico como piso determinista. Solo cuenta la cita textual del modelo (`citaEnTurno`). Máquina de estados con propiedades probadas (fast-check). Topes de gasto en código. 46 pruebas | ✔︎ |
| Demo (25%) | Pantalla "ESTÁ A SALVO, CUELGA" mientras el "comandante" sigue hablando. Falla visible: no contesta → 2º contacto → 089 | Falta la UI |

## Real vs simulado (para el video y el write-up)

- **Real:**
  - transcripción del audio por el modelo
  - clasificación de etapas
  - reglas del agente
  - verificación en el teléfono del familiar (PWA)
  - topes de gasto
- **Simulado y rotulado:**
  - la llamada (recreación con la familia, con su consentimiento)
  - los guiones de `data/guiones/` (sintéticos)
- **Nunca:** voces o datos de víctimas reales.

## Evaluación (29-oct)

Corrida sobre 8 guiones sintéticos (4 de secuestro virtual y 4 llamadas normales) escritos por el mismo autor del léxico. Es una prueba de humo, no una medición seria.

| Modo | Secuestros detectados | Turno de alerta (promedio) | Falsas alarmas | Etapas correctas | Costo |
|---|---|---|---|---|---|
| Solo léxico (`pnpm eval`) | 4/4 | 2.5 | 0/4 | 91% | $0 |
| Léxico + Muse Spark Open en Baseten (`pnpm eval --modelo`) | 4/4 | **1.0** | 0/4 | **94%** | $0.069 (39 turnos, ~6 s cada uno) |

Faltan dos cosas:
- Guiones generados aparte, que no haya escrito el mismo autor.
- Audio real por altavoz (`pnpm humo audio/prueba.wav`).

## Plan

| Día | Qué |
|---|---|
| Jue 29 ✔︎ | Núcleo, cliente multi-proveedor, oído con open weights, humo, eval, build |
| Vie 30 | Keys de Baseten/OpenRouter. `pnpm humo audio/prueba.wav` con audio regio por altavoz. **Puerta 14:00** |
| Sáb 31 | (Expediente del Tec.) UI de escucha: grabar trozos de 6 s, panel de etapas y API route |
| Dom 1 | PWA del familiar ("¿Estás bien?"), verificación en paralelo, grabar la recreación |
| Lun 2 | Falla visible + expediente. Deploy público. README para jueces. Medir segundos hasta "a salvo" |
| Mar 3 | Video, write-up y **entrega completa** |
| Mié 4 | Colchón, post en X. Cierre 20:00 |

## Orden de recorte (si falta tiempo, se corta de abajo hacia arriba)

1. ~~Glimmer + LoRA~~ (primero en caer)
2. Expediente con borrador de denuncia
3. Segundo contacto (se queda solo el 089)
4. Tiempo real por micrófono (se queda el modo archivo en trozos)
5. **Nunca se corta:** oído → etapas → verificación → "ESTÁ A SALVO, CUELGA"
