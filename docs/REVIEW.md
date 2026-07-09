# Review pass (maker != checker)

The code author and the reviewer are different "roles". Below is what the
reviewer found with fresh eyes, after the tests were already green.

## Finding 1 — incorrect overlap detection (fixed) 
- **Symptom:** `findOverlaps` compared only ADJACENT blocks after sorting.
- **Impact:** one long block (9:00-12:00) covering several shorter blocks later
  in the list reported only one overlap instead of all of them.
- **Evidence:** the added test "long block covers a NON-adjacent block" failed (1 < 2).
- **Fix:** pairwise comparison of all blocks (O(n^2) — acceptable for a day plan).
- **Status:** test is green, regression closed.

## Checked and deemed OK
- R3 (zero/negative duration) — covered by tests.
- Comments `#` and empty lines — ignored.
- Labels with an inner dash/time ("code-review", "call at 9:30") — parsed.
- Day boundaries (0:00, 23:59) — valid; 24:00 — rejected.

## Deliberately left as is (within SPEC section 7)
- Blocks crossing midnight are not supported — out of scope.
- `findOverlaps` returns all pairs rather than transitive clusters — enough to
  highlight conflicts in the UI.
