## 4. Event System

- [ ] 4.1 Expand `example/src/data/gameContent.ts` to contain at least 2 events per category (24 events total across 12 categories)
- [ ] 4.2 Ensure every event has 2-4 choices; add a choice requirement field for any resource-gated choice
- [ ] 4.3 Add at least 2 chain events (choices with nextEventId) spanning different categories
- [ ] 4.4 Define per-loadout category weight maps and wire them into `selectEvent()`
- [ ] 4.5 Write unit tests: all events have 2-4 choices; all referenced nextEventIds resolve to existing events