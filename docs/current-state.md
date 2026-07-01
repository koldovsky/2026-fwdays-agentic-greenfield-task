# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

- Fixed `package.json` scripts (`web/node_modules/.bin/*` → `next`/`eslint`). `yarn build` + `yarn lint` green.
- Adopted SDD (OpenSpec): filled `openspec/config.yaml` (context + artifact rules); added baseline specs `openspec/specs/{app-shell,design-system,checklist,bullets}/spec.md`, all `openspec validate --specs` passing; documented SDD workflow in `AGENTS.md`.

Earlier this session:
- Added Agentic Engineering skills (Claude + Cline): `agent-verify`, `fsd-scaffold`, `checker-review`, `honesty-eval`, `sync-current-state`.
- Renamed app to **Vouch**; wired design tokens (Tailwind `@theme` + `next/font`); authored `docs/DESIGN.md`, `docs/system-design.md`; rebuilt `AGENTS.md` + `CLAUDE.md`.

## Working on

Nothing in-flight. No `FR-*` feature implemented yet — repo is Next shell + design system only.

## Next steps

1. Build FSD skeleton per `docs/system-design.md` §6: `shared` → `entities` → `features` → `widgets` → `views`.
2. Start with `shared/lib`: pure scoring (`FR-CHECKLIST-01/04`) + i18n (`NFR-I18N-01`) — unit-test first (`TC-PURE-01`).
3. Then `run-tailoring` pipeline: parse → JD extract → gen pass → grounding pass (`FR-TAILOR-*`, `FR-BULLETS-03`).

## Blockers / open questions

- Auth provider (`TC-STACK-07`) and merchant-of-record (`TC-STACK-06`) undecided.
- No test runner configured yet — needed before `agent-verify`/`honesty-eval` can run real tests.
