# Worktree flow — disjoint parallel slices

The harness runs **one requirement per pass** on one branch (`AGENTS.md` development loop). When two
slices are genuinely **disjoint** — they touch different packages/files and neither depends on the
other — you can work them in parallel without branch-switch thrash using `git worktree`: each slice gets
its own working directory on its own branch, sharing one clone's object store.

This is an *optional outer-loop convenience*, not a new contract. Every worktree still obeys the full
inner loop: test-first, gates green, `Refs:`/`Slice:` trailer, one PR per slice.

## When it's worth it

- ✅ Disjoint slices — e.g. M1 codec skeleton in `editor-core` vs. an unrelated docs/harness change.
- ✅ A long review on branch A while you start branch B.
- ❌ **Not** for overlapping slices (same files / shared codec): the round-trip corpus and parity gates
  assume one coherent change — parallel edits to the same surface invite exactly the drift the harness
  exists to prevent. Sequence those on one branch.

## Setup (one worktree per slice)

```bash
# from the main clone (transon-blockly/)
git worktree add ../tb-m1-codec    -b m1-codec     # slice A → sibling dir, new branch
git worktree add ../tb-docs-fix    -b docs-fix     # slice B → another sibling dir

# enable the binding hooks in each worktree (hooksPath is per-working-tree config)
( cd ../tb-m1-codec && git config core.hooksPath harness/githooks )
( cd ../tb-docs-fix && git config core.hooksPath harness/githooks )
```

Each directory is a normal checkout: run `python harness/scripts/check_maturity.py` etc. inside it. The
engine sibling (`../transon`) is found the same way from any worktree (`TRANSON_REPO` or the
parent-of-parent `transon` lookup) — verify with `update_memory.py --check`.

## Finish & clean up

```bash
# in the worktree: commit (trailer enforced), push, open the PR for that slice
git worktree remove ../tb-m1-codec     # after it merges; removes the dir
git worktree prune                     # tidy stale entries
```

## Guardrails

- **One slice per worktree**, one PR per worktree — keep the maker≠checker boundary intact (review a
  worktree's branch from elsewhere, never self-review).
- **Don't share a branch across worktrees** (git forbids checking out the same branch twice anyway).
- Re-run `update_memory.py --state` for the working handoff in whichever worktree ends the session.
