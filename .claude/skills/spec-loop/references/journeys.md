# Real-stack user journeys — the project contract

This is the gate that catches what every other gate misses. Unit tests pass against mocks; a diff review
reads one change in isolation. **None of them proves the running system works.** The bugs that ship green
live at the **seams between specs** — the glue in the app's composition root, a route that was never
filled, a datum no spec persisted, an error swallowed with no surfaced state. A **real user journey driven
against the real stack** is the only thing that exercises those seams.

So the loop runs the project's journeys as the heart of Gate 2 (and the final stop-judge sweep). The skill
stays generic: it defines the **contract**; each project fills it in — in its `loop.config.sh` binding, not
here. The skill names no runner, service, storage, or URL.

## The non-negotiable rules of a journey

A "journey" only counts if it is:

- **Real-stack.** Real backing services (a real server/database/API, not a mock), the app's **real
  persistent storage** in its real runtime, a **prod-style build** — not a dev server in fixture/seed mode.
- **No fixture seed, no mocked network.** If the journey only passes with a demo/fixture integration or a
  stubbed network, it proves nothing — that is a **FAIL**. Populate state the way a real user does (drive
  the app to create real data), never by seeding fake data.
- **Stateful & cross-seam.** Drive a path that crosses sessions or subsystems and **assert the outcome**:
  create state → **relaunch the app** → assert it resumed; mutate → assert it reached the server (a fresh
  client sees it); cache → go offline → open from cache; change a setting → reload → assert the effect.
- **Durable.** Authored as a **committed** journey spec run by the project's declared runner
  (`loop_journeys`), so it becomes a regression test that re-runs cheaply in CI — not an ephemeral
  exploratory session (an interactive/MCP session is for _exploring_ a flow before you codify it, or a
  fallback when the runner is absent).

## What the project must declare (the contract)

The loop discovers these generically from `loop.config.sh` — it hard-codes no service name, runner, or URL.
A non-UI / library project declares none of them, and their absence is how the loop knows journeys don't
apply.

1. **`loop_services_up` / `loop_services_down`** (optional — omit if the project needs no services): bring
   the real backing services up and tear them down. Up must leave them **ready** (provisioned, healthy),
   not merely started.
2. **`loop_preview`** — build the app prod-style and serve it the way a real user gets it (no seed/fixture
   mode), then **export `LOOP_BASE_URL`** (the target the journeys hit). The journeys hit this, never a
   fixture dev server. The URL/port lives here, in the project's binding — never in the skill.
3. **`loop_journeys`** — run the committed journey specs against the real stack, **tagged by capability**
   (e.g. `@core`, `@sync`, `@offline`, `@settings`) so the verifier can run the subset a given spec
   touches, and the stop-judge can run them all.
4. **Review skills** (optional): which skills the loop's reviewers reuse — a code-review skill for the
   Gate-2 reviewer's correctness lens, a security-review skill for the dedicated end-of-run (and
   security-critical) deep pass. If unset, the reviewers apply their lenses directly.

`loop-status.sh` reports which of these the project provides, so the loop surfaces a missing contract at
Step 0 rather than discovering it mid-gate.

## How the loop uses it

- **Planner (Gate 0)** writes the **journey acceptance** for the spec: which journey(s) it must make pass,
  including any seam it must close. If the right journey doesn't exist yet, the spec's journey is _authored_
  by the verifier this round and committed.
- **Verifier (Gate 2)** brings up the real services (`loop_services_up`), builds+serves (`loop_preview`),
  runs the relevant tagged journeys (`loop_journeys`) against the real stack, then tears down. A failure —
  or a journey that only passes seeded — fails the gate. Trace/artifact on failure only; **no video**.
- **Stop-judge** runs the **full** journey suite against the real stack before the loop declares victory.

## The reusable part — journey patterns

Each pattern below is a real, stateful, cross-seam check a per-diff test suite misses, and each maps to a
class of bug that ships green otherwise. The **patterns** are the reusable core; a project binds each to
its own domain. Tag names are illustrative — the project names its own.

- **`@resume`** — create real state → **relaunch the app** (same persistent profile/storage) → assert it is
  restored. _(catches "reopens blank / at the start".)_
- **`@sync`** — mutate state → assert it **round-trips to the server** (a fresh client / re-query sees it).
  _(catches an unflushed write — an outbox that never triggers.)_
- **`@offline`** — cache data → go offline → open it from cache; a failed fetch must surface an **error
  state**, not a silently-swallowed failure. _(catches a swallowed error.)_
- **`@settings`** — change a preference → **reload** → assert it persisted and applies from the first paint;
  assert no route resolves to a placeholder. _(catches a placeholder screen archived as "done".)_
- **`@list`** — with a real integration connected, assert the UI renders **real server data** (not
  demo/fixture rows); with none connected, assert an empty / onboarding state, never demo data.

## Illustrative binding (NOT part of the skill)

To make the abstract contract concrete, here is **one** illustrative `loop.config.sh` shape for a project
with a UI and a containerized backing service. A different project swaps the service (a DB, a container, an
external API, or none), swaps the runner, and lists its own journeys — the skill itself names none of them.

| Contract             | Example binding (in the project's `loop.config.sh`)                                            |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `loop_services_up`   | start + provision the backing service (container / DB / API), **blocking** until healthy/seeded |
| `loop_services_down` | stop it                                                                                        |
| `loop_preview`       | build the **prod** app + serve it (no fixture/seed mode); export `LOOP_BASE_URL`               |
| `loop_journeys`      | invoke the project's journey runner over the committed journey specs                          |
| review skills        | the project's security-review + code-review skills                                            |

Setup notes the binding must honor (generically): the journeys hit `LOOP_BASE_URL` from `loop_preview`, and
must honor **whatever access rules that service requires** — discover them from the service's own config,
don't hard-code them. Authenticate as a **least-privilege** account. Assert **real** persisted state, not a
network stub. If the runner supports it, a global setup step can call `loop_services_up`, and a persistent
profile/storage between launches makes the relaunch/resume assertion real.

> This is one illustrative binding. Another project swaps the backing service, the storage, and the runner
> and lists its own journeys — the skill itself names none of them.
