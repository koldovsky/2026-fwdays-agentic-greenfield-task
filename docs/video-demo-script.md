# Colibri Book — STG demo script (~90 sec)

**URL:** http://colibri.64.225.115.88.nip.io  
**Record:** browser window + mic (Loom / QuickTime / OBS). Speak the lines below as you click.

---

## 0:00 — Intro (10 sec)

> Hi, I'm Max Bugaiov. This is **Colibri Book** — my homework for fwdays Agentic Engineering Greenfield.  
> It's a booking concierge for Mahogany HOA tennis courts: plain language in, live availability from MHOA, automated form submit with captcha.

---

## 0:10 — Login (8 sec)

**Do:** Open STG → `/login` → sign in as household user.

> The app is authenticated — only residents can book. I'll log in and go to Book.

---

## 0:18 — Book wizard (35 sec)

**Do:** `/book` → show Who / When / What steps briefly.

> The wizard collects **who** is playing, **when** they want a slot, and a natural-language request — for example, “East Court, nine to ten on Saturday.”

**Do:** On **When**, wait for availability panel (live Playwright scrape).

> Here the server scrapes MHOA's real calendar — not mock data. Green slots are open; grey are taken.  
> If the date is outside MHOA's seven-day window, I can **schedule for later** — the job waits in a queue until the window opens.

**Do:** (Optional) show one date with slots; don't need to complete a live booking on video.

---

## 0:53 — Scheduled queue (15 sec)

**Do:** Click **Scheduled** in the nav.

> Scheduled jobs show status, errors, and **next retry in Calgary time** — cron tries every ten minutes, but only when there's work in the queue.

---

## 1:08 — Confirmed bookings (12 sec)

**Do:** Click **My bookings**.

> Successful MHOA submissions land here with date, court, and slot — until the reservation time passes.  
> We already confirmed real bookings on staging against mahoganyhoa.com.

---

## 1:20 — How I built it (25 sec)

**Do:** (Optional) flash repo in another tab — `openspec/changes/`, `docs/requirements.md`, or `npm test` terminal — or stay on STG.

> I built this agentically, not vibe-coding: a PRD with numbered requirements, **OpenSpec** change specs before code, Cursor rules for tests on every scenario, and deploy-smoke-fix loops on this staging droplet.  
> Verification is sixty unit tests, Playwright E2E, and a post-deploy smoke script that includes a live availability scrape. CodeRabbit reviews the PR — maker versus checker.

---

## 1:45 — Outro (5 sec)

> That's Colibri Book on staging. Link in the PR. Thanks!

---

## Recording checklist

- [ ] Mic test — quiet room
- [ ] 1280×720 or full screen browser
- [ ] Hide password if typing login
- [ ] Availability step may take 15–30 s — start loading **before** you talk, or use `--quick` local demo as backup
- [ ] Export 1–2 min (trim silence at start/end)
- [ ] Upload to YouTube (unlisted) / Loom / Drive
- [ ] Paste link into PR under `Video:`

## Ukrainian narration (optional, for course channel)

Same beats — swap intro/outro/practices block:

> Привіт, я Макс Бугайов. Це **Colibri Book** — домашка з Agentic Engineering Greenfield…  
> …PRD, OpenSpec перед кодом, правила Cursor, цикли deploy-smoke-fix, шістдесят unit-тестів і Playwright E2E. CodeRabbit — maker не дорівнює checker.
