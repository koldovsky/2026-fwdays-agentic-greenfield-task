## 7. Colonization and Ending

- [ ] 7.1 Implement colonization eligibility check: suitability >= 20 required; expose `canColonize(planet: Planet): boolean`
- [ ] 7.2 Verify `generateColonyOutcome()` covers all government/society/outcome branches per spec section 9
- [ ] 7.3 Verify `generateColonyName()` uses Descriptor + Noun + PlanetName format with lists of >= 10 items each
- [ ] 7.4 Verify `calculateExpeditionScore()` uses the spec formula (base 2000 + suitability*50 + resources + turn bonus)
- [ ] 7.5 Implement `ColonyReportView` component: planet name, colony name, government, society, outcome, score, seed, and narrative text
- [ ] 7.6 Write unit tests: Legendary outcome conditions; score decreases with more turns; government branches match spec