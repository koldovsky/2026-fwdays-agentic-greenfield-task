# Agent runs (the persistent session journal)

This folder is the **append-only journal of what each agent session actually did**.
A chat report is ephemeral — it scrolls away with the conversation. This folder is the
durable record: every agent session (maker, checker, judge, auditor, or a one-off task)
writes one file here so a later agent or human can reconstruct *who did what, what they
ran, what they found, and what they left open* without replaying the chat.

It complements, and does not replace, the other trail artifacts:

- [`docs/current-state.md`](../current-state.md) is the **latest** handoff snapshot (one
  living document, overwritten each milestone). This folder is its **history** (one
  immutable file per run, never rewritten).
- [`docs/qa/reviews/<slice>.md`](../qa/reviews/) is the **machine-read review evidence**
  that `scripts/check-trajectory` gates on (`Result: pass`). A run record here is the
  **human-readable narrative** around that evidence, and can exist for runs that produce
  no `reviews/` file at all (implementation, audits, infra).
- [`docs/qa/trajectory.md`](../qa/trajectory.md) proves only the **git-visible** process
  facts. A run record captures the parts git cannot show: the real command output, the
  reviewer verdicts, and the honest "what I did not do".

## One file per run

Name each file `NNN-<slice>-<role>.md`:

- `NNN` — a zero-padded, monotonically increasing **run counter** (`001`, `002`, …),
  independent of the slice number. Take the next unused number in this folder.
- `<slice>` — the slice the run concerns (`auth`, `timer`, …), or `infra` for
  cross-cutting work that no numbered slice owns.
- `<role>` — the agent role or activity: `test-engineer`, `implementer`, `code-review`,
  `security-review`, `judge`, `audit`, `review-close`, …

Example: [`001-auth-review-close.md`](001-auth-review-close.md) — the independent audit of
slice 001's review-and-close pass.

## Every file follows the template

Copy [`TEMPLATE.md`](TEMPLATE.md) and fill every section. The non-negotiables, straight
from [`AGENTS.md`](../../AGENTS.md) reporting rules:

- **Verification** carries the **commands you ran and their real output**, never "looks
  good". State each exit status.
- **Findings** are tagged `[BLOCKING]` / `[MINOR]` with a `path:line` anchor.
- **What was NOT done** is stated plainly — no silent skips.

A record is written *in addition to* the chat report, using the same
Summary · Changes · Verification · Risks/Follow-ups structure inside it where it fits.
