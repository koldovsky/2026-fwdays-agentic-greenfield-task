---
name: round-trip-review
description: Pre-merge review checklist for changes affecting Transon round-trip correctness or runtime safety — the JSON⇄IR codec, variant matching, supported surface, marker escape, ordering, or anything touching engine execution, file writes, includes, or remote examples. Use when reviewing or before merging such changes.
disable-model-invocation: true
---

# Round-trip & runtime-safety review

Apply when a change touches the trust-critical core or a security-sensitive surface (`SPEC.md` §21.6,
§21.11). Cite the SPEC/AD ID for every finding.

## Round-trip correctness (AD-003, AD-004, AD-011)

```
- [ ] Equivalence is checked SEMANTICALLY via engine execution, not textual JSON (§15.1, AD-011).
- [ ] Every in-surface template round-trips with no silently dropped case (§15.7); out-of-surface
      input fails clearly or uses the exact-preserving placeholder (§13.11) — never rewritten.
- [ ] Each rule invocation matches EXACTLY one variant; zero/multiple/partial -> import_unsupported
      (§15.6, §17.6).
- [ ] Ordering preserved where it affects Transon: object keys, array items, chain steps,
      set-before-get (§13.12, §15.3).
- [ ] Custom marker honored everywhere, including the object/fields literal-marker escape (§11.4, §15.4).
- [ ] A round-trip corpus case exists for the touched rule/variant/operator/function (§15.8).
- [ ] Bidirectional JSON edits apply only when valid AND in-surface; otherwise error, workspace
      unchanged (§7.15, AD-024).
```

## Catalog & metadata (AD-012, AD-014)

```
- [ ] The catalog comes from the engine get_editor_metadata() export; no parallel hand-list added.
- [ ] Generic and specialized blocks emit IDENTICAL JSON per variant (AD-014).
- [ ] python harness/scripts/check_engine_parity.py passes (rules/operators/functions match the engine).
```

## Runtime safety (AD-008, AD-009, AD-010, §21.11)

```
- [ ] No engine runtime bundled; validation/execution cross the host EngineProvider (AD-008).
- [ ] `file` writes are captured, never written to the local filesystem in preview (NFR-035, AD-009).
- [ ] `include` resolves only via the host loader; a missing loader is reported, not guessed (AD-010).
- [ ] Remote examples are treated as data, not executable app code (NFR-034); no user data is sent to
      any editor-owned backend (NFR-032/033).
- [ ] No arbitrary Python authoring/execution outside the host engine (NFR-030, FR-087).
```

Report findings as `🔴 Critical (must fix)`, `🟡 Suggestion`, or `🟢 Nice-to-have`, each with its ID.

For a full pre-merge pass, this checklist is the **round-trip correctness** and **runtime safety**
dimensions of the `harness/workflows/review-gate.md` workflow, which fans these alongside the catalog,
spec/traceability, and harness dimensions and then *adversarially refutes* each finding before merge.
