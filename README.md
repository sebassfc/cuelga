# Cuelga

**While the extortionist is still talking, Cuelga quietly confirms your family member is safe and tells you when to hang up.**

Built for the Meta Global AI Developer Hackathon (Indie track, Oct 26 – Nov 4, 2026). Every line in this repo was written during the event, starting Oct 29, 2026. This is a work in progress.

## The problem

Virtual kidnapping is a common extortion script in Mexico. A caller plays a crying voice ("¡Abuelita, ayúdame!") and claims to be holding a relative. They keep the victim on the line ("no cuelgue"), pose as a commander or the police, then demand a deposit at OXXO. The relative is usually perfectly safe, but the person on the phone has no way to check without hanging up. In 2025 the state of Nuevo León recorded 991 extortion victims, the 4th highest in the country (SESNSP data via Grupo Animal).

## How it works

1. The family sets up, with everyone's consent, who could be "kidnapped", plus a second contact.
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
- **Spend caps in code:** every model call reserves its worst-case cost first and is refused past the cap.

## Run it

```bash
pnpm install
cp .env.example .env.local   # add your own key; never commit it
pnpm test                    # unit + property tests
pnpm eval                    # lexicon-only eval on synthetic scripts (no network, free)
pnpm humo                    # 5-minute smoke test: model access + one Spanish classification
pnpm humo audio/test.wav     # + listens to a WAV in 6 s chunks
```

The scripts in `data/guiones/` are **synthetic**. Written for evaluation, they contain no real victims' calls.

## License

MIT
