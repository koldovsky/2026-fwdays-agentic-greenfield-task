## Context

The product flow starts with the applicant profile: four NMT scores, elective choice,
and benefit toggles. Inputs must recompute instantly (NFR-PERF-01), persist via
`state-persistence`, and use the Prokhidnyi design system from `app-shell`.

## Goals / Non-Goals

**Goals:**
- Four `.pk-range` sliders (100–200) for required + elective subjects.
- Six-option elective `.pk-chip` picker relabelling the 4th score row.
- Three `.pk-toggle-row` benefit toggles wired to the catalog.
- Accessible labels, `aria-valuetext`, and `role="group"` on picker groups.

**Non-Goals:**
- Score import from external APIs or OCR.
- Validation beyond NMT range clamping.

## Decisions

### D1 — All state via `useProfile`
`ScorePanel` is presentational; the hook/store owns persistence and downstream
recompute triggers.

### D2 — Elective gates eligibility downstream
Changing elective does not clamp scores but changes which programs `scoring-engine`
marks as fitting.

### D3 — Reuse `clampScore` from scoring module
Single source for 100–200 bounds shared with the engine.

## Risks / Trade-offs

- **Slider vs numeric entry** → MVP uses sliders only for simplicity and touch targets.
- **Instant recompute cost** → pure scoring over 11 programs is negligible.
