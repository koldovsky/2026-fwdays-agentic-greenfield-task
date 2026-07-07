## Context

Bye Binge targets users at the precise moment they feel an urge to binge. Every millisecond of friction between the urge and the STOP button increases the chance the user bypasses the app entirely. The emergency-intercept capability must feel instantaneous and must work offline. It is the single most important user-facing interaction in the product.

The app is a Next.js PWA with Zustand for local state and TanStack Query for server sync. The tone-engine capability owns `activeToneMode` in the Zustand store; all copy in this capability is read from that value. Draft persistence uses `localStorage` so it survives reloads without a server round-trip and works fully offline.

## Goals / Non-Goals

**Goals:**
- Zero-latency STOP button always visible on every route.
- Full-screen modal mounts synchronously — no async data fetching on the critical path.
- STEPP wizard guides the user through 3 phases with tone-driven copy.
- Grounding Summary renders after phase 3 completion.
- Mid-wizard close is guarded by an explicit confirmation dialog.
- Draft state (current phase + answers) is persisted to `localStorage` and restored on next open.
- All copy hardcoded for MVP (TC-TEXT-01); structured to allow future tone-engine injection.

**Non-Goals:**
- AI-generated or server-fetched wizard copy (deferred post-MVP).
- Biometric integration (explicitly out of scope per requirements).
- Syncing completed STEPP sessions to the server (offline-pwa capability owns background sync).
- Customisation of STEPP categories during onboarding (deferred post-MVP).

## Decisions

### D1 — StopButton placement: root layout, not per-page

**Decision:** Render `<StopButton>` in the root Next.js layout so it is always mounted regardless of route. Do not conditionally render it per page.

**Rationale:** Per-page rendering risks missing routes, creates flicker on navigation, and requires every new page to remember to include it. Root layout guarantees presence with zero per-route effort.

**Alternative considered:** A React context provider tree. Rejected because it adds indirection without benefit — the button has no per-page configuration.

---

### D2 — Modal mounting strategy: pre-mounted, hidden by default

**Decision:** Mount `<EmergencyModal>` in the root layout alongside `<StopButton>`, hidden via CSS (`display: none` / `visibility: hidden`). Reveal it by toggling a Zustand boolean (`isEmergencyModalOpen`), not by conditionally rendering it into the DOM.

**Rationale:** NFR-PERF-01 requires zero-friction mounting. Conditional rendering incurs a React reconciliation + paint cycle on the critical path. Pre-mounting amortises that cost at app load, so the STOP tap shows the modal in a single style update.

**Alternative considered:** Lazy-loading the modal on first STOP press. Rejected — introduces a ~50–200 ms JS parse + mount delay exactly when the user needs instant response.

---

### D3 — STEPP wizard state: Zustand slice, persisted to localStorage

**Decision:** Store wizard state (`currentPhase`, `phase1Answer`, `phase2Answers`, `phase3Answers`, `isDraft`) in a dedicated Zustand slice (`steppDraft`). Persist this slice to `localStorage` via `zustand/middleware/persist`.

**Rationale:** Zustand's `persist` middleware handles hydration automatically, including SSR-safe deferred hydration. Using the same store for UI state (which phase is shown) and draft state (saved answers) keeps the data flow simple — no separate storage layer to synchronise.

**Alternative considered:** Direct `localStorage` reads/writes in component effects. Rejected — race conditions between renders and storage writes, harder to test.

---

### D4 — Safe exit: confirm dialog, not auto-save and exit

**Decision:** When the user attempts to close the modal mid-wizard, show a browser-native `confirm()` or a lightweight inline confirmation UI. Only dismiss the modal if the user confirms. Wizard draft is already persisted (D3), so the user's progress is never lost regardless of their choice.

**Rationale:** The confirmation step fulfils FR-STOP-03. Because drafts are persisted (FR-STOP-04), the confirmation is purely about preventing accidental dismissal, not about saving data.

**Alternative considered:** Auto-saving and closing without confirmation. Rejected — users may accidentally press the close affordance; the extra confirm step is a safety net against that.

---

### D5 — Copy architecture: tone-keyed constant maps

**Decision:** Hardcode all wizard copy in a single `lib/emergency-intercept/copy.ts` file, structured as a map keyed by `ToneMode` (`calm | rational | auntie`). Components read copy via a `useWizardCopy()` hook that returns the correct map for `activeToneMode`.

**Rationale:** TC-TEXT-01 mandates hardcoded copy for MVP. A keyed map makes it easy to audit copy completeness per tone and trivially swap in a dynamic source post-MVP by updating only the hook.

**Alternative considered:** Inline copy inside components. Rejected — impossible to audit, copy changes require touching component files.

---

### D6 — Grounding Summary: reads from completed draft + success story store

**Decision:** After phase 3 submission, the `GroundingSummary` component reads the completed `steppDraft` answers from the Zustand store and picks one success story from the stories list (from `progress-logging` / `dashboard` capability). If no user stories exist, fall back to the 3 universal stories (same fallback logic as FR-DASH-04).

**Rationale:** Reuses the existing success story data structure — no new data model needed.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Pre-mounted modal increases initial bundle size | Code-split modal internals (SteppWizard, GroundingSummary) with `React.lazy` while keeping the outer modal shell synchronous. Shell is tiny; heavy content loads lazily after first user interaction. |
| `localStorage` unavailable (SSR, private browsing with storage blocked) | Wrap all persist calls in try/catch; fall back to in-memory Zustand state. Draft is lost on reload but wizard still functions. |
| tone-engine not yet implemented when this ships | Use `'calm'` as default `ToneMode` if `activeToneMode` is undefined. All copy maps must have a `calm` key as the baseline. |
| Wizard blocks scroll on iOS (100dvh modals) | Use `height: 100dvh` with `-webkit-fill-available` fallback; test on Safari iOS. |

## Open Questions

- Should a completed STEPP session be synced to Supabase immediately, or only via the background sync in `offline-pwa`? (Recommendation: defer to `offline-pwa` for consistency — this capability only persists locally.)
- Do we log a binge-free day automatically when the user completes the wizard, or must the user explicitly tap "Log binge-free day" in `progress-logging`? (Recommendation: keep them decoupled — wizard completion ≠ binge-free day.)
