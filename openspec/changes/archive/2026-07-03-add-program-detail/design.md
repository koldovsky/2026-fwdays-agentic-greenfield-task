## Context

Trust requires "show your work": how the competitive score was built, how volatile
cutoffs are, and honest framing of the estimate as a range (BC-HONESTY-01). The
modal is a leaf view opened from cards, comparison, and shortlist.

## Goals / Non-Goals

**Goals:**
- Per-subject breakdown rows summing to the displayed competitive score.
- 3-year cutoff bar chart (2022–2024) with latest year highlighted.
- Category advice text; uncertainty band + in-context disclaimer.
- Accessible dialog: `role="dialog"`, Escape/overlay close, labelled title.
- Footer save and compare actions reflecting current profile state.

**Non-Goals:**
- Editing scores inside the modal (return to `score-input`).
- New persistence or data fields.

## Decisions

### D1 — `scoreBreakdown` scales rows to capped competitive
Breakdown contributions are scaled so their sum equals `evaluation.competitive`
even when raw weighted sum exceeds 200.

### D2 — Neutral advice when `fits === false`
No chance-based guidance for programs that reject the chosen elective.

### D3 — Server-safe modal shell
Modal content is client-only where needed; formatting uses shared `uk-UA` helpers.

## Risks / Trade-offs

- **Breakdown vs engine cap** → scaling logic must stay in sync with `competitiveScore`.
- **Dialog focus trap** → focus moves to close button on open for keyboard users.
