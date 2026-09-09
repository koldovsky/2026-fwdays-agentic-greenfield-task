## 8. Achievement System

- [ ] 8.1 Confirm all 9 achievements are defined in `INITIAL_ACHIEVEMENTS` with correct ids, names, descriptions, icons
- [ ] 8.2 Add "Archivist" achievement (discover every event category) to the achievement list and unlock logic in `checkAchievements()`
- [ ] 8.3 Implement unlock persistence: save/load unlocked achievement IDs to LocalStorage key `pioneer_achievements`
- [ ] 8.4 Implement achievement unlock toast notification component (non-blocking, auto-dismisses after 3 seconds)
- [ ] 8.5 Write unit tests for each of the 9 unlock conditions in `checkAchievements()`