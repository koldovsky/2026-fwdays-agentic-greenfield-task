# Colibri Book — Mahogany HOA outdoor booking concierge

**fwdays Academy · Agentic Engineering: Greenfield** — homework submission.

Plain-language tennis (and future picnic) booking for [Mahogany HOA](https://mahoganyhoa.com/facilities/outdoor/): parse intent, show live court availability, submit MHOA forms with captcha OCR, queue bookings outside the 7-day window, and list confirmed reservations.

**Stack:** Next.js 16 · TypeScript · Playwright · Python (ddddocr) · OpenSpec · Playwright E2E

## Quick start

```bash
cp .secret.example .secret   # edit credentials
cp .env.example .env           # optional local overrides
npm ci && npm run dev          # http://localhost:3000
npm test                       # unit + cron wrapper
npm run test:e2e               # Playwright (stub submit)
```

Live MHOA submit: `COLIBRI_SUBMIT_MODE=live` (see `.env.example`).

## Documentation

| Document | Purpose |
| -------- | ------- |
| [docs/requirements.md](docs/requirements.md) | PRD — `FR-*` requirements, MHOA constraints |
| [openspec/](openspec/changes/) | Spec-driven change proposals (OpenSpec) |
| [AGENTS.md](AGENTS.md) | Agent / Next.js notes |
| [.cursor/rules/](.cursor/rules/) | Cursor rules (OpenSpec-first, QA, testing) |

## Agentic engineering (this project)

- **Context engineering** — PRD, Cursor rules, OpenSpec artifacts, skills
- **Spec-driven development** — OpenSpec change per feature; validate before `src/**`
- **Loop engineering** — deploy → smoke → fix cycles on STG
- **Maker ≠ checker** — CodeRabbit on PR; separate QA browser rules; unit + E2E gates
- **Verification** — 60+ unit tests, Playwright E2E, post-deploy smoke script

## Homework submission

Fork: [github.com/mbugaiov/2026-fwdays-agentic-greenfield-task](https://github.com/mbugaiov/2026-fwdays-agentic-greenfield-task)  
Upstream: [github.com/koldovsky/2026-fwdays-agentic-greenfield-task](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task)

1. Push feature branch to your fork
2. Open PR **into `koldovsky/2026-fwdays-agentic-greenfield-task`** using [.github/pull_request_template.md](.github/pull_request_template.md)
3. Enable **CodeRabbit** on the fork
4. Attach **1–2 min video** demo + practices write-up
5. Submit the PR link in the course channel

## Status

| Phase | State |
| ----- | ----- |
| PRD / OpenSpec | Done (tennis MVP) |
| Booking wizard + live submit | Done |
| Availability preview | Done |
| Scheduled queue + cron | Done |
| Confirmed bookings | Done |
| STG deploy | http://colibri.64.225.115.88.nip.io |
| Demo video | Pending |
| Homework PR | Pending |

---

Питання — у каналі курсу. Успіхів, і нехай цикли працюють на тебе 🟢
