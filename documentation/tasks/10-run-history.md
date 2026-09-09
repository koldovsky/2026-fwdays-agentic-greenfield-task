## 10. Run History

- [ ] 10.1 Implement `saveRunRecord(record: RunRecord): void` — appends to LocalStorage key `pioneer_history` (max 100 records, prune oldest)
- [ ] 10.2 Implement `loadRunHistory(): RunRecord[]` — reads and parses from LocalStorage; returns empty array if missing/corrupt
- [ ] 10.3 Implement `computeStats(history: RunRecord[]): GameStats` — derives all 7 aggregate statistics
- [ ] 10.4 Implement `HistoryScreen` component: list of past runs (date, planet, outcome, score) and aggregate stats panel
- [ ] 10.5 Implement Replay button in HistoryScreen: starts a new run pre-populated with the stored seed
- [ ] 10.6 Write unit tests for `computeStats()`: bestScore, averageScore, fastestVictory edge cases