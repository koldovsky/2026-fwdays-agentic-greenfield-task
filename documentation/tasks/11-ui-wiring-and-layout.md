## 11. UI Wiring and Layout

- [ ] 11.1 Implement the four-region layout in `App.tsx`: Header, Center (event card), Sidebar (resources + active modifiers), Footer (action buttons)
- [ ] 11.2 Wire the phase machine in `App.tsx`: LOADOUT_SELECTION -> TURN_LOOP -> COLONIZATION -> COLONY_REPORT -> (back to LOADOUT_SELECTION or HISTORY)
- [ ] 11.3 Implement `DashboardHeader` showing: ship name, turn counter, active seed, hull integrity bar
- [ ] 11.4 Implement `ResourcePanel` showing all 9 resources with icons and change-delta indicators
- [ ] 11.5 Implement `EventCardView` showing event title, category badge, description, and 2-4 choice buttons (locked choices styled differently)
- [ ] 11.6 Implement `PlanetScannerView` showing discovered planets with suitability score and colonize button (disabled if suitability < 20)
- [ ] 11.7 Ensure the app works fully offline: no external CDN fetches; all fonts and assets bundled
- [ ] 11.8 Verify dark space-terminal color palette: no white/light backgrounds in game screens; primary accent colors are Cyan and Amber