## 5. Planet Generation

- [ ] 5.1 Verify `generatePlanet()` in `gameEngine.ts` covers all 6 axes and 0-3 hazards from the hazard pool
- [ ] 5.2 Verify `calculateSuitability()` matches spec weighting (Temperature 25, Atmosphere 30, Gravity 15, Water 15, Life 10, Resources 5, -10 per hazard, clamped 5-100)
- [ ] 5.3 Verify `generatePlanetName()` produces names matching the Prefix-Number[Letter] or Prefix Number pattern
- [ ] 5.4 Write unit tests: perfect planet scores 100; each hazard reduces score by 10; same seed produces same planet