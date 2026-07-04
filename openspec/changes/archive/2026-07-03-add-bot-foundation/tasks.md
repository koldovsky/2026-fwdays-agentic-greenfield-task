## 1. Project scaffold (TC-STACK-01..03, NFR-OPS-01)

- [x] 1.1 Create `nedilya-na-vagakh/` with `bot/` package (`__init__.py`, module stubs) and `tests/` directory
- [x] 1.2 Add `requirements.txt` pinning `python-telegram-bot` and `pytest`
- [x] 1.3 Add `pytest.ini` (or equivalent) so `pytest` runs from `nedilya-na-vagakh/`
- [x] 1.4 Add `.env.example` documenting `BOT_TOKEN`, `ALLOWED_USER_IDS`, and optional `DATABASE_PATH`
- [x] 1.5 Ensure `data/` or DB parent dir is gitignored; document in `.env.example`

## 2. Configuration (NFR-OPS-01, bot-runtime spec)

- [x] 2.1 Implement `bot/config.py`: load env vars, parse `ALLOWED_USER_IDS` into `set[int]`, default `DATABASE_PATH`
- [x] 2.2 Fail fast with clear errors when `BOT_TOKEN` or `ALLOWED_USER_IDS` is missing or invalid
- [x] 2.3 Add `tests/test_config.py` covering valid parsing and invalid allowlist rejection

## 3. SQLite persistence (NFR-REL-01, TC-STACK-02)

- [x] 3.1 Implement `bot/db.py`: connection helper, `init_schema()` with `CREATE TABLE IF NOT EXISTS` for `user_settings` and `weigh_ins` per PRD data model
- [x] 3.2 Add `UserSettings` and `WeighIn` dataclasses matching PRD columns
- [x] 3.3 Implement `bot/repository.py`: `get_or_create_settings`, `insert_weigh_in`, `get_latest_weigh_in` (and any helpers needed for tests)
- [x] 3.4 Add `tests/test_db.py` using in-memory SQLite: schema creation, settings defaults (`Оленка`, `09:00`, `Europe/Kyiv`, weekday 6), insert/fetch weigh-in, restart simulation

## 4. Bot runtime (TC-DEPLOY-01)

- [x] 4.1 Implement `bot/main.py`: build `Application`, call `init_schema()` before polling, `run_polling()`
- [x] 4.2 Wire config loading at startup; log startup success without printing secrets
- [x] 4.3 Verify manual smoke: process starts with valid `.env` (document in commit or PR notes)

## 5. Access control (FR-SEC-01, FR-SEC-02)

- [x] 5.1 Implement `bot/middleware.py` (or handler group `-1`): check `effective_user.id` against allowlist
- [x] 5.2 Reply with neutral Ukrainian refusal for non-allowlisted users; stop handler chain; no DB access
- [x] 5.3 Register allowlist gate on the `Application` before any other handlers
- [x] 5.4 Add `tests/test_middleware.py` for allowlist pass/block logic (mock update/context)

## 6. Verification and PRD traceability

- [x] 6.1 Run full `pytest` suite from `nedilya-na-vagakh/`; all tests green
- [x] 6.2 Map implemented behavior to PRD IDs: TC-STACK-01..03, TC-DEPLOY-01, NFR-OPS-01, NFR-REL-01, FR-SEC-01, FR-SEC-02
- [x] 6.3 Update `docs/prd.md` statuses for covered foundation requirements from `accepted` → `shipped`
- [x] 6.4 Update `docs/current-state.md` with foundation implementation summary
