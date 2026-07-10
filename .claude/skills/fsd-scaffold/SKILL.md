---
name: fsd-scaffold
description: Scaffold a new Feature-Sliced Design slice for Vouch at the correct layer with ui/model/api/lib segments and an index.ts public API, honoring the downward-only import rule. Use when adding a feature/widget/entity/view/shared module, or on "create a slice", "add a feature", "scaffold".
metadata:
  author: vouch
  version: "1.0"
---

Scaffold an FSD slice that matches Vouch's architecture. Architecture-as-context: the layout is the guardrail.

**Steps**

1. **Read the architecture.** `docs/system-design.md` §5–6 (layers, segment convention, Next App Router mapping).

2. **Pick the layer:**
   - `features/` — one user action (verb): `run-tailoring`, `upload-cv`, `export-resume`.
   - `entities/` — a business noun: `cv-profile`, `tailoring`, `requirement`, `user`.
   - `widgets/` — a self-contained composite block: `result-view`, `checklist-panel`.
   - `views/` — a route-level composition (FSD "pages", renamed to avoid Next's `app/` clash).
   - `shared/` — reusable, framework-free lib / ui-kit / config.

3. **Name + trace.** Derive a kebab-case slice name; map it to a capability / requirement ID from the PRD.

4. **Create `src/<layer>/<slice>/`** with only the segments it needs:
   ```
   ui/      React components
   model/   state, hooks, types
   api/     calls to route handlers / server actions
   lib/     slice-local pure helpers
   index.ts public API barrel — the ONLY entry other layers import
   ```

5. **Enforce the import rule.** A slice imports only from layers **below** it. `features` never import `features` — cross-talk goes through `entities`/`shared`, or is composed upward in `widgets`/`views`. Never reach past another slice's `index.ts`. `shared/lib/**` stays framework-free: no `next/*`, no DOM globals (`TC-PURE-01`).

6. **Stub tests** for any pure `lib` logic (deterministic, off-browser).

7. **Handoff.** Update `docs/current-state.md`.

**Guardrails**
- No upward or sibling-layer imports; no deep-imports across slices.
- Server-only code (parsing, LLM calls, queue producers) belongs in `src/app/**` route handlers / server actions, not in `shared/ui`.
- Keep `src/app/**` route files thin — render one `views/*` slice.
