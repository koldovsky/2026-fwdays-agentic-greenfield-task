# Accessibility Report (axe-core)

Generated: 2026-07-04T01:11:00Z  
Command: `node scripts/run-with-server.mjs node scripts/check-a11y.mjs`  
Profile: WCAG 2 A/AA (`wcag2a`, `wcag2aa`), light scheme only (single paper theme)

## Result

| Route | Scheme | Serious/Critical |
|---|---|---|
| `/` | light | **0** |

**Verdict: PASS** — no serious or critical axe violations.

## Notes

- Prokhidnyi ships a single light theme; `A11Y_SCHEMES` defaults to `light` (no dark-mode false positives).
- Token tweaks applied for AA contrast: `--pk-slate-*`, `--pk-action`, `--pk-real-text`, ring numerals use `-text` variants, labels use `--pk-slate-500`.
- Pair with `docs/qa/vision-report.md` for eyes-on-pixels validation (axe does not catch all perceived contrast issues).
