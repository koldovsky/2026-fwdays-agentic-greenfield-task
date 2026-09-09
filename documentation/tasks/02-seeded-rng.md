## 2. Seeded RNG

- [ ] 2.1 Verify `example/src/utils/rng.ts` implements a fully seeded PRNG with `next()`, `range()`, `choice()`, and `sample()` methods
- [ ] 2.2 Add `RNG.seed` getter so the active seed is always accessible from the RNG instance
- [ ] 2.3 Write unit tests for RNG: same seed produces same sequence; range is inclusive; sample has no duplicates