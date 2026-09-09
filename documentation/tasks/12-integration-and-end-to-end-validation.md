## 12. Integration and End-to-End Validation

- [ ] 12.1 Play a full run from loadout selection to colony report and verify all screens render without errors
- [ ] 12.2 Replay the same seed twice and verify all events, planet, and colony name match
- [ ] 12.3 Reach turn 50 and verify "One More Turn" achievement unlocks with a toast
- [ ] 12.4 Allow Crew to reach 0 and verify defeat screen appears instead of a new event
- [ ] 12.5 Save 3 runs and open History screen; verify all stats (totalRuns=3, bestScore, etc.) are correct
- [ ] 12.6 Run `npm run lint` in `example/` and verify zero TypeScript errors
- [ ] 12.7 Run `openspec validate pioneer-directive` and verify all artifacts pass