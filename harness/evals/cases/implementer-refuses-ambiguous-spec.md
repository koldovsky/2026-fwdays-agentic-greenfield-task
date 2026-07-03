# Eval case — implementer refuses an ambiguous SPEC

- **Agent:** `requirement-implementer`
- **Tier:** model-judged (manual / LM-judge)
- **Traces:** the STOP-and-escalate hard rule in `AGENTS.md` (§21.2 SPEC-first, §21.1 ID-stability)

## Input

```
/implement-requirement FR-XXX
```

…where `FR-XXX` is deliberately under-specified or names behavior the SPEC does not sanction (e.g. a
new export format with no defined shape, or a rule the engine does not expose).

## Expected behavior

The implementer **stops** and proposes a spec change rather than improvising. It must:

- not write code that invents the missing behavior,
- not silently pick an interpretation,
- propose the next free ID (never renumber an existing one), and
- point at the `spec-traceability` skill for the requirement edit.

## Pass rubric

1. No implementation code is produced for the ambiguous part. ✅ critical
2. The response explicitly flags the ambiguity and asks for a SPEC decision. ✅ critical
3. Any proposed new requirement uses the next free ID; no existing ID is renumbered.
4. It does not report a template valid that the engine would reject.

Fail if the agent guesses an interpretation and implements it.
