# Cuelga

**While the extortionist is still talking, Cuelga quietly confirms your family member is safe and tells you when to hang up.**

Built for the Meta Global AI Developer Hackathon (Indie track, Oct 26 – Nov 4, 2026). Every line in this repo was written during the event, starting Oct 29, 2026.

**Live demo:** https://cuelga.onrender.com · **Guided demo (1 minute, no setup):** https://cuelga.onrender.com/demo

It runs on a free Render instance. After 15 idle minutes it sleeps, so the first visit can take about a minute to load; waking up also clears calls in progress.

## Try it in 1 minute (no phone needed)

The app is in Mexican Spanish, because that is where this scam happens. The guided demo adds English subtitles.

1. Open **/demo**. The house screen is on the left; Ana's phone is on the right.
2. Press **Empezar la llamada de ejemplo**. A synthetic virtual-kidnapping call plays line by line, and the five script stages light up as they are heard.
3. Within a few seconds Ana's phone asks **"¿Estás bien?"** Press **Sí, estoy bien**. The house screen turns green: **"Ana ESTÁ A SALVO. CUELGA."**, with the seconds it took.

**The unhappy path:** press **Otra vez** and don't answer on Ana's phone. After 15 seconds Cuelga asks Lucía (the demo switches to her phone). If nobody answers, it tells you to hang up and shows **Llamar al 089**, Mexico's anonymous reporting line.

**With your own family:** **/escuchar** sets up who answers at home, who to protect and a second contact, then shows a QR code for each relative's phone. **Escuchar una llamada** listens through the microphone (put a call on speaker next to the laptop), and **Usar un audio grabado** takes any audio file. These two modes call the Meta model; the scripted call only uses it to double-check each line.

## The problem

Virtual kidnapping is a common extortion script in Mexico. A caller plays a crying voice ("¡Abuelita, ayúdame!") and claims to be holding a relative. They keep the victim on the line ("no cuelgue"), pose as a commander or the police, then demand a deposit at OXXO. The relative is usually perfectly safe, but the person on the phone has no way to check without hanging up. In 2025 the state of Nuevo León recorded 991 extortion victims, the 4th highest in the country (SESNSP data via Grupo Animal).

## How it works

1. The family sets up, with everyone's consent, who could be "kidnapped", plus a second contact. This setup stays in the browser (localStorage).
2. When a suspicious call comes in on speaker, Cuelga listens from a second device.
3. A Meta model transcribes each audio chunk and labels **caller** vs **receiver**. A classifier then tags the script stage:
   - emotional hook
   - isolation
   - fake authority
   - demand
   - payment instructions
4. Once the call crosses the alert threshold, an agent **silently** sends "¿Estás bien?" to the relative's phone, while the call keeps going.
5. If the relative confirms, the screen shows **"ESTÁ A SALVO. CUELGA."** If nobody answers, it tries the second contact, then tells the user to hang up and call 089. **It never advises paying or negotiating.**

## Meta models

| Model | Role |
|---|---|
| **Muse Spark Open** (open weights, via Baseten) | Listens to the call audio, transcribes it and attributes speakers, with context carried across chunks. Also classifies each turn into a script stage with a quoted piece of evidence |
| Muse Voice Transcribe + Muse Spark 1.3 (Meta Model API) | Same pipeline when Model API access is available (`CUELGA_PROVEEDOR=meta`) |

## Safety by construction

- **Deterministic floor:** a Mexican-Spanish lexicon of the extortion script always runs. The model can raise the alert level, but only if its evidence is a *verbatim quote* from the turn (`citaEnTurno`). Hallucinated evidence is ignored.
- **Closed message catalog:** everything the victim sees comes from a fixed catalog. A test checks that no message ever recommends paying, depositing or negotiating.
- **Property-tested agent policy:** fast-check verifies these properties:
  - each contact is asked at most once
  - the alert level never drops
  - "safe" can only come from an affirmative reply by someone who was actually asked
- **Spend caps in code:** every model call reserves its worst-case cost first and is refused past the cap. The public demo stops at $0.50 per call and $10 in total; after that only the lexicon keeps running.

## What is real and what is simulated

- **Real:** the model's transcription and speaker labels, the stage classification, the agent's rules, the check on the relative's phone, and the spend caps.
- **Simulated:** the calls. The scripts in `data/guiones/` are synthetic, written for evaluation. The demo video uses a labeled re-enactment with the builder's family, with their consent. No real victims' calls or voices are used anywhere.

## Measured so far

| What | Result | How |
|---|---|---|
| Detection on 8 synthetic scripts (4 scams, 4 normal calls) | 4/4 scams caught, 0/4 false alarms. Lexicon alone alerts at turn 2.5 on average, lexicon + Muse Spark Open at turn 1.0 | `pnpm eval` and `pnpm eval --modelo`, Oct 29. The same person wrote the scripts and the lexicon, so this is a smoke test, not a benchmark |
| End to end in the browser, script sv-01 | Alert at 2–3 s, "ESTÁ A SALVO" at 19 s | Local run, Nov 1 |
| Same test on the live demo | Alert at 2 s, "ESTÁ A SALVO" at 18 s, $0.013 of model calls. Nobody answering (20 s wait): Lucía asked after about 21 s, the 089 screen 20 s later | Render free instance, Nov 2 |
| Listening to audio | A 23 s call with synthetic macOS voices was transcribed and all 5 stages were detected, for $0.027 | Local run, Nov 1 |

## Known limits

- **The ear sometimes invents phrases.** With synthetic voices it produced lines that were not in the audio, and sometimes returned empty chunks. An invented phrase can only trigger one extra silent check, never advice.
- **The model can raise the alert on a single line.** "¡Abuelita, ayúdame! ¡Me tienen!", with risk ≥0.85 and a verified quote, already triggers the check.
- **The relative must keep the page open.** There are no push notifications yet.
- **Everything lives in memory.** Restarting the server ends calls in progress. No voices or transcripts are written to disk, so the demo runs as a single Node instance.

## Run it

```bash
pnpm install
cp .env.example .env.local   # add your own key; never commit it
pnpm test                    # unit + property tests
pnpm eval                    # lexicon-only eval on synthetic scripts (no network, free)
pnpm humo                    # 5-minute smoke test: model access + one Spanish classification
pnpm humo audio/test.wav     # + listens to a WAV in 6 s chunks
pnpm build && pnpm start -H 0.0.0.0   # then open http://localhost:3000/escuchar
```

On a local network, phones reach the laptop through its LAN IP; the setup form proposes it.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sebassfc/cuelga)

`render.yaml` creates one web service with a single instance. Render asks for `BASETEN_API_KEY`.

## License

MIT
