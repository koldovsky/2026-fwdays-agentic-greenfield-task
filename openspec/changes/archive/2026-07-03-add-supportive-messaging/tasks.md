## 1. Messages module (FR-MSG-01..04, FR-MSG-07, BC-TONE-01, NFR-TEST-01)

- [x] 1.1 Add `bot/messages.py` with ≥ 3 variants per trend pool (progress, fluctuation, stable)
- [x] 1.2 Implement `prefix_with_name` and `pick_support_line` with injectable `rng`
- [x] 1.3 Add `tests/test_messages.py` covering prefix, pool selection, random pick, no «регрес»

## 2. Weigh-in integration (FR-MSG-03)

- [x] 2.1 Load `display_name` from settings on successful `/вага`
- [x] 2.2 Append supportive line when `previous` exists (weight trend from `classify_trend`)
- [x] 2.3 Extend `tests/test_weigh_in_handlers.py`: supportive line on second log, omitted on first

## 3. Help command (FR-MSG-08)

- [x] 3.1 Add `bot/handlers/help.py` with `/допомога` static Ukrainian help text
- [x] 3.2 Register handler in `bot/main.py`
- [x] 3.3 Add `tests/test_help_handlers.py` for command list and input format example

## 4. Verification and PRD traceability

- [x] 4.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 4.2 Map behavior to PRD IDs: FR-MSG-01..04, FR-MSG-07..08, BC-TONE-01
- [x] 4.3 Update `docs/current-state.md` with supportive-messaging implementation summary
