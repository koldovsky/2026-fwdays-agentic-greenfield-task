#!/usr/bin/env bash
# loop.config.sh — THIS project's binding for the spec-loop skill.
#
# The spec-loop / spec-loop-preflight skills are stack-agnostic: they name no package
# manager, test runner, or URL. Everything project-specific lives HERE, in one file the
# skill's scripts source from the repo root. Swap this file and the same loop drives a
# Rust / Python / Go / anything repo.
#
# This file is the SINGLE source of truth the loop reuses — it must mirror what the
# project's hooks / pre-commit / CI already run, so "the hooks fired during Gate 1" and
# "verify-gate.sh ran at Gate 2" are the same suite. The loop is a reuser, not a definer.

# Timestamp timezone for the STATE spine (default UTC if unset). This team stamps in
# Europe/Kyiv; any other project omits this line and gets UTC.
LOOP_TZ="Europe/Kyiv"

# loop_verify — the project's OWN full deterministic gate. Run once at Gate 2 for the
# evidence record; exit non-zero on any hard failure. These are exactly the checks this
# repo enforces (see package.json). Advisory-only checks (fallow `check`, audit) are left
# out of the hard gate on purpose — they inform triage, they don't block.
loop_verify() {
  pnpm run typecheck \
    && pnpm run lint \
    && pnpm run format:check \
    && pnpm run test \
    && pnpm run build
}

# --- Real-stack journey contract (this repo has a UI + a real backing service) ----------
# A non-UI / library project omits every loop_* below; their ABSENCE is how the loop knows
# journeys don't apply (there is no framework auto-detection).

# Bring up the real backing service (throwaway Komga in Docker) and block until it is
# provisioned + healthy — not merely started. See test/komga/README.md.
loop_services_up() {
  pnpm run komga:up && pnpm run komga:provision
}

# Tear the backing service down (keep the DB; komga:reset wipes it).
loop_services_down() {
  pnpm run komga:down
}

# Build prod-style and serve the app the way a real user gets it (no fixture/seed mode),
# then export LOOP_BASE_URL for the journey runner. `vite preview` serves the built app;
# its URL is the project's concern, declared here, never in the skill.
loop_preview() {
  pnpm run build
  pnpm run preview &
  LOOP_PREVIEW_PID=$!
  export LOOP_BASE_URL="${LOOP_BASE_URL:-http://localhost:4173}"
}

# Run the durable, committed journey specs against the real stack.
loop_journeys() {
  pnpm exec playwright test e2e/journeys
}
