# Improvement Proposal: improve-PD-16

- **Defect:** PD-16 — `review-gate` computed `clean = confirmed.length === 0`, but the security/spec reviewers emit positive `Clean — …` notes and a `Coverage summary` line (verdict `confirmed` because they are accurate). Counting those as confirmed DEFECTS made `clean:true` unreachable for any thorough review, and `check-trajectory` (PD-8) requires `clean:true` to archive.
- **Class / severity:** check-too-weak / P1 (blocks every earned slice from archiving).
- **Status:** approved (discovered while archiving the first earned slice, S5).

## Fix

Exclude positive/informational notes (title starting `Clean` or `Coverage summary`) from the confirmed/contested defect sets. `clean` is now "no confirmed DEFECTS", not "no confirmed findings".

```diff
-const confirmed = verified.filter(Boolean).filter((f) => f.verdict === 'confirmed')
+const isPositiveNote = (f) => /^\s*(clean\b|coverage summary\b)/i.test(f.title || '')
+const confirmed = verified.filter(Boolean).filter((f) => f.verdict === 'confirmed' && !isPositiveNote(f))
```

## Proof

The S5 final review returned 10 "confirmed" of which ~5 were `Clean — …`/`Coverage summary` positives. Regex check:
```
"Clean — Authorization not applicable"  -> EXCLUDED
"Coverage summary — all scenarios"      -> EXCLUDED
"listInvoices shallow-frozen footgun"   -> defect (kept)
"tasks.md test-count stale"             -> defect (kept)
```
node --check passes.

## Rollback

Single commit; `git revert <sha>`. Experimental ladder.

## Approval

Serhii, 2026-07-11 (in-session, driving S5 to archive). Trailer: `Refs: PD-16`.
