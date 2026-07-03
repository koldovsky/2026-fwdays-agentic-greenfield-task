## Context

`omnictx kube list` prints `* <name>` / `  <name>` lines from `kube.Contexts() []string`. The kubeconfig projection (`kubeFile`) deliberately decodes only what render needs (`name`, `namespace`). Users expect the `kubectl config get-contexts` table (CURRENT/NAME/CLUSTER/AUTHINFO/NAMESPACE); all of that data is already in the files we parse.

## Goals / Non-Goals

**Goals:**
- kubectl-style table for `kube list` with zero new dependencies.
- Keep merge/dedupe/broken-file semantics and the quiet no-contexts case exactly as specced.

**Non-Goals:**
- Flags for output formats (`-o name` etc.) — one good default, kubectl remains for exotic needs.
- Column-for-column byte parity with kubectl's padding — same columns and meaning, alignment via tabwriter.
- Sorting — keep file-then-definition order (kubectl sorts alphabetically; our order preserves `$KUBECONFIG` priority intuition).

## Decisions

1. **`Contexts()` changes signature to `[]ContextEntry{Name, Cluster, AuthInfo, Namespace}`.**
   Internal API with two call sites (list, switch validation) — a clean break beats a parallel `ContextsDetailed`. The switch path just ranges over entries comparing `.Name`.

2. **Projection extension, not a second parse:** `kubeFile.Contexts[].Context` gains `Cluster` and `User` yaml tags. The namespace lookup used by render is untouched.

3. **Rendering with `text/tabwriter`** (minwidth 0, tabwidth 0, padding 3, space char) into the provided `stdout` writer: header written only when at least one context exists; `*` or empty string in the CURRENT cell. tabwriter gives kubectl-like triple-space alignment without manual width math.

4. **Dedupe keeps the first definition** (unchanged) — with the richer entries this now also pins which cluster/user/namespace row wins for duplicate names, matching the read-path precedence story.

## Risks / Trade-offs

- [Scripts parsing the old `* name` output break] → accepted and flagged **BREAKING** in the proposal; the listing is an interactive convenience, and `omnictx kube` (bare) remains the stable single-value output for scripting.
- [tabwriter buffers; large context counts] → negligible (dozens of rows).

## Migration Plan

Single-commit swap; revert to roll back. Spec, tests, and README move in the same change.

## Open Questions

None — header-only-when-nonempty confirmed with the user ("нема контекстів → порожній вивід без заголовка").
