# PRD — Outdoor Activity Booking (Mahogany HOA MVP)

Last updated: 2026-07-03  
Site inspection: 2026-07-03 (live pages on mahoganyhoa.com)

This document is the **single source of truth** for what the product does and what
constraints govern it. Every requirement has a stable ID. Specs, tests, PRs, and
recordings reference these IDs for traceability.

## Product summary

**Outdoor Activity Booking** is a concierge service that accepts resident contact
details plus a natural-language booking request, then completes reservations on
third-party outdoor-facility websites. The **MVP integrates only with Mahogany
Homeowners Association (MHOA) outdoor bookable facilities**, starting with forms
published under [mahoganyhoa.com/facilities/outdoor/](https://mahoganyhoa.com/facilities/outdoor/).

Future providers (e.g. camping platforms) share the same user-facing flow but are
**out of MVP scope**.

### Reference sources (MHOA) — inspected 2026-07-03

| Facility | URL | Form status |
| -------- | --- | ----------- |
| Tennis courts | [tennis-courts-3](https://mahoganyhoa.com/facilities/outdoor/tennis-courts-3/) | **Active** — inline WordPress form, image captcha |
| Beach picnic sites | [barbecue-pits](https://mahoganyhoa.com/facilities/outdoor/barbecue-pits/) | **Active** — JotForm iframe wizard, signature + payment steps |
| Beach volleyball | [beach-volleyball-courts](https://mahoganyhoa.com/facilities/outdoor/beach-volleyball-courts/) | Not bookable — “coming soon” |
| Natural amphitheatre | [natural-ampitheatre](https://mahoganyhoa.com/facilities/outdoor/natural-ampitheatre/) | Not bookable — “coming soon” |
| Volleyball / basketball / playground / boats | [FAQ](https://mahoganyhoa.com/facilities/facilities-and-bookings-faq/) | First-come, first-served — not bookable |

## Actors

| Actor | Description |
| ----- | ----------- |
| **Resident** | Mahogany HOA member initiating a booking via our app |
| **Booking agent** | Automated subsystem that parses intent, validates rules, and submits MHOA forms |
| **MHOA website** | External WordPress site hosting facility forms, JotForm embeds, and captcha |

## ID conventions

| Prefix | Meaning | Example |
| ------ | ------- | ------- |
| `FR-*` | Functional requirement | `FR-INPUT-01` — user provides email |
| `NFR-*` | Non-functional requirement | `NFR-REL-01` — idempotent submission |
| `TC-*` | Technical constraint | `TC-CAPTCHA-01` — captcha must be solved before submit |
| `BC-*` | Business / provider constraint | `BC-MHOA-TENNIS-01` — 45-minute slot duration |
| `OOS-*` | Explicitly out of scope | `OOS-CAMP-01` — camping providers |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Functional requirements

### Provider & facility selection

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-PROV-01 | User can choose a booking provider; MVP lists **Mahogany HOA** only | proposed |
| FR-PROV-02 | After provider selection, user sees **outdoor bookable** facility types: Tennis Courts, Beach Picnic Sites | proposed |
| FR-PROV-03 | Facility types without MHOA booking forms (volleyball, amphitheatre, skatepark) are not selectable; UI explains they are unavailable | proposed |
| FR-PROV-04 | Architecture allows adding future providers (e.g. Camping) without changing the core user-input contract | proposed |

### User input (booking request)

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-INPUT-01 | User provides **email** (required, valid format) | proposed |
| FR-INPUT-02 | User provides **phone number** (required; normalised to MHOA formats: tennis `###-###-####`, picnic `(000) 000-0000`) | proposed |
| FR-INPUT-03 | User provides **resident address** (required; Mahogany street address) | proposed |
| FR-INPUT-04 | User provides **natural-language booking request** (required, min 10 chars), e.g. *“Friday from 11 AM till 1 PM — any 45-minute slot”* | proposed |
| FR-INPUT-05 | Form validates required fields client-side before submission; errors are field-specific and human-readable | proposed |
| FR-INPUT-06 | User confirms parsed interpretation (date, time window, facility, slot length, court/site) before the agent submits to MHOA | proposed |
| FR-INPUT-07 | User provides **full name** (required; first and last — maps to MHOA “Full Name” or JotForm name fields) | proposed |
| FR-INPUT-08 | Court preference (**East** / **West**) or picnic **site** (Main/West Beach #1–#2) inferred from NL text when stated; otherwise agent picks first available or asks user | proposed |

### Natural-language parsing

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-NLP-01 | System extracts **target day or date** from free text (weekday names, relative dates, explicit calendar dates) | proposed |
| FR-NLP-02 | System extracts **time window** (start/end or duration) from free text | proposed |
| FR-NLP-03 | System maps duration hints to provider slot length (tennis → 45 minutes; picnic → one of three fixed windows) | proposed |
| FR-NLP-04 | System handles ambiguity by asking one clarifying question or presenting ranked options — never silently guessing | proposed |
| FR-NLP-05 | Parsed output shown as `{ facility, courtOrSite?, date, windowStart, windowEnd, slotDurationMinutes?, guestCount? }` | proposed |

**Example mappings**

| User text | Parsed intent |
| --------- | ------------- |
| “Friday from 11 AM till 1 PM any slot for 45 minutes” | Next eligible Friday; tennis; search 11:00–13:00 for any available 45-min court slot |
| “Next Saturday morning tennis on East court” | Next eligible Saturday; East Court; morning window |
| “Picnic site July 12 afternoon for 30 people at West Beach” | 2026-07-12; picnic; prefer 13:30–17:00; guest count 30; West Beach site preference |

### MHOA rule validation (pre-submit)

Rules sourced from MHOA public pages, inspected 2026-07-03.

#### Tennis courts

| ID | Description | Status |
| -- | ----------- | ------ |
| BC-MHOA-TENNIS-01 | Slot duration is **45 minutes** | accepted |
| BC-MHOA-TENNIS-02 | **One reservation per household per day** | accepted |
| BC-MHOA-TENNIS-03 | Bookings allowed until **11:59 p.m. the night before** requested date | accepted |
| BC-MHOA-TENNIS-04 | Bookings allowed up to **7 days in advance** (day 8+ greyed on calendar) | accepted |
| BC-MHOA-TENNIS-05 | **Same-day bookings are not accepted** (today greyed on calendar) | accepted |
| BC-MHOA-TENNIS-06 | Courts close at **9:30 PM**; last bookable slot ends 9:45 PM | accepted |
| BC-MHOA-TENNIS-07 | Two courts: **East Court** and **West Court** | accepted |
| BC-MHOA-TENNIS-08 | Operating slots observed **09:00–21:45** in 45-min increments; availability shown per slot (link = open, text = taken/blocked) | accepted |
| FR-VALID-TENNIS-01 | Reject requests violating BC-MHOA-TENNIS-* with explicit reason | proposed |
| FR-VALID-TENNIS-02 | Cross-check against tennis program schedule blackouts when schedule data is available | proposed |

#### Beach picnic sites

| ID | Description | Status |
| -- | ----------- | ------ |
| BC-MHOA-PICNIC-01 | **Residents only**; non-residents cannot book | accepted |
| BC-MHOA-PICNIC-02 | **One booking per household per day** | accepted |
| BC-MHOA-PICNIC-03 | Fixed daily windows: **9:30–13:00**, **13:30–17:00**, **17:30–21:00** | accepted |
| BC-MHOA-PICNIC-04 | **Max 40 people** per booking (including infants) | accepted |
| BC-MHOA-PICNIC-05 | Non-refundable fee **$52.50** (GST included) | accepted |
| BC-MHOA-PICNIC-06 | Season **May long weekend – September long weekend** (weather-dependent) | accepted |
| BC-MHOA-PICNIC-07 | Guest list required **72 hours** before event | accepted |
| BC-MHOA-PICNIC-08 | **Four sites**: Main Beach #1, Main Beach #2, West Beach #1, West Beach #2 | accepted |
| BC-MHOA-PICNIC-09 | No changes within **72 hours** of booking; rain reschedule within season, min 1 week notice | accepted |
| FR-VALID-PICNIC-01 | Reject requests outside season, over capacity, or violating household/day limits | proposed |
| FR-VALID-PICNIC-02 | When picnic form iframe fails to load, surface “provider unavailable” — do not fake success | proposed |

### Form submission & captcha

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-SUBMIT-01 | Agent navigates to the correct MHOA facility URL for the selected type | proposed |
| FR-SUBMIT-02 | Agent fills all required MHOA form fields from user profile + parsed slot | proposed |
| FR-SUBMIT-03 | Agent **detects and solves captcha** on tennis form (image security code) before submit | proposed |
| FR-SUBMIT-04 | Agent submits the form and captures confirmation or error response from MHOA | proposed |
| FR-SUBMIT-05 | On captcha failure, retry up to **3** times with fresh captcha fetch; then fail with actionable message | proposed |
| FR-SUBMIT-06 | Submission is **idempotent per user request** — duplicate clicks do not create duplicate MHOA bookings | proposed |
| FR-SUBMIT-07 | Full submission flow is logged (timestamp, facility, parsed slot, outcome) for audit; no secrets in logs | proposed |
| FR-SUBMIT-08 | Tennis: select court → calendar date → available time slot link, then resident fields | proposed |
| FR-SUBMIT-09 | Tennis: check **Rules and Regulations** acknowledgement checkbox | proposed |
| FR-SUBMIT-10 | Picnic: complete JotForm multi-step wizard (New Booking path), including **signature pad** and any payment step | proposed |
| FR-SUBMIT-11 | Picnic: fill **confirmation email** field matching primary email | proposed |

### Results & cancellation guidance

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-RESULT-01 | Success shows: facility, date, time slot, MHOA confirmation text if present | proposed |
| FR-RESULT-02 | Failure shows: reason (validation, captcha, provider down, no availability) and suggested next step | proposed |
| FR-RESULT-03 | UI displays MHOA cancellation contacts: tennis → reception@mahoganyhoa.com / (403) 453-1221; picnic → bookings@mahoganyhoa.com / (403) 453-1221 ext. 12 | proposed |

### Availability preview

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-AVAIL-01 | Before final tennis submit, show **all available slots** for **East and West courts** on the parsed date; user selects court + slot | proposed |
| FR-AVAIL-02 | On `/book`, show live availability for bookable dates; user may **pick a slot** directly or use NL on the next step | proposed |
| FR-AVAIL-04 | Availability errors are user-friendly with retry; failed responses are not cached client-side | accepted |

### Scheduled booking

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-SCHED-01 | When target date is outside MHOA 7-day window, **queue scheduled booking** with `opensAt`; auto-submit when window opens | accepted |
| FR-SCHED-02 | Parse **multiple residents** (e.g. Max and Nataliia) and create one job per resident / slot count | accepted |
| FR-SCHED-03 | Scheduler runs via `npm run schedule:run` (cron); retries until booked or deadline (11:59 PM night before) | accepted |
| FR-SCHED-04 | `/scheduled` lists queued jobs (cancel, refresh); nav tab separate from `/book` wizard | accepted |
| FR-SCHED-05 | Active scheduled jobs show **next cron retry** time in Calgary (America/Edmonton) | accepted |

### Confirmed bookings (active list)

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-BOOK-01 | `/bookings` lists MHOA-approved tennis reservations until the slot ends | accepted |
| FR-BOOK-02 | Successful wizard submit and scheduled job completion are persisted to confirmed store | accepted |
| FR-BOOK-03 | Expired entries are removed automatically when listing active bookings | accepted |

### Booking wizard

| ID | Description | Status |
| -- | ----------- | ------ |
| FR-WIZ-01 | `/book` uses **What → Who → When → Confirm** screens | proposed |
| FR-WIZ-02 | **Who** supports multiple household members; **When** shows one slot picker per person | proposed |
| FR-WIZ-03 | Each participant slot is submitted as an **independent** MHOA request | proposed |

---

## MHOA form field mapping (inspected 2026-07-03)

### Tennis courts — inline form on WordPress page

Form title: **2026 Tennis Court Booking**

| MHOA field | Type | Required | Maps from our input |
| ---------- | ---- | -------- | ------------------- |
| East Court or West Court | Combobox | Yes | FR-INPUT-08 |
| Date | Calendar widget (month/year nav; eligible dates clickable) | Yes | FR-NLP-01 |
| Time slot | 45-min links after court selected (e.g. `09:00 AM-09:45 AM` … `09:00 PM-09:45 PM`) | Yes | FR-NLP-02 |
| Full Name | Text `[First] [Last]` | Yes | FR-INPUT-07 |
| Phone | Three boxes `###` `-` `###` `-` `####` | Yes | FR-INPUT-02 |
| Email | Text | Yes | FR-INPUT-01 |
| Mahogany Address | Text `[Street Address]` | Yes | FR-INPUT-03 |
| Rules and Regulations | Checkbox + link | Yes | FR-SUBMIT-09 |
| Security Code | Image captcha (clickable image) + text input | Yes | FR-SUBMIT-03 |
| Submit Booking | Button | — | FR-SUBMIT-04 |

**Calendar behaviour (observed on 2026-07-03):** Today (Jul 3) and past dates greyed; Jul 4–10 clickable; Jul 11+ greyed (7-day advance limit). Selecting court loads slots for next eligible date.

**Slot availability (observed):** Available slots render as clickable links; unavailable slots render as plain text.

### Beach picnic sites — JotForm iframe embed

Embed URL pattern: `form.jotform.com/261005496214249` (iframe on barbecue-pits page)

**Step 1 — booking type**

| Field | Type | Required |
| ----- | ---- | -------- |
| New Booking / Rescheduling | Radio | Yes |

**Step 2+ — resident, site, date, time (multi-section wizard)**

| MHOA field | Type | Required | Maps from our input |
| ---------- | ---- | -------- | ------------------- |
| First Name / Last Name | Text (`q3_name`) | Yes | FR-INPUT-07 |
| Mahogany Address | Text (`q4_mahoganyAddress`) | Yes | FR-INPUT-03 |
| Phone Number | Tel `(000) 000-0000` | Yes | FR-INPUT-02 |
| Email | Email | Yes | FR-INPUT-01 |
| Confirmation Email | Email (must match) | Yes | FR-INPUT-01 |
| Requested Location | Radio — Main Beach #1, Main Beach #2, West Beach #1, West Beach #2 | Yes | FR-INPUT-08 |
| Available Dates | Calendar (per selected site) | Yes | FR-NLP-01 |
| Appointment time | Time buttons (e.g. `1:30 PM`, `5:30 PM` — availability varies by date/site) | Yes | FR-NLP-02 / BC-MHOA-PICNIC-03 |
| Rules agreement | Checkbox | Yes | FR-SUBMIT-09 |
| Signature | Canvas signature pad | Yes | FR-SUBMIT-10 |
| Date Signed | Date (defaults to today) | Yes | Auto-filled |

**Additional steps:** Guest count and payment ($52.50) expected in later wizard pages — full field list to be captured during implementation (TC-FORM-02).

---

## Non-functional requirements

| ID | Description | Status |
| -- | ----------- | ------ |
| NFR-SEC-01 | User PII encrypted at rest; never logged in plain text | proposed |
| NFR-SEC-02 | No MHOA credentials stored; agent acts as user-facing proxy only | proposed |
| NFR-REL-01 | Submission retries bounded; no infinite loops on captcha or network errors | proposed |
| NFR-OBS-01 | Each booking attempt produces a traceable run ID linked to requirements verification | proposed |
| NFR-LEGAL-01 | Product discloses automation of mahoganyhoa.com submission; user attests residency and rule compliance | proposed |
| NFR-A11Y-01 | Input form meets WCAG AA for labels, focus, and error association | proposed |
| NFR-I18N-01 | MVP UI in English | proposed |

---

## Technical constraints

| ID | Description | Status |
| -- | ----------- | ------ |
| TC-EXT-01 | MHOA forms are external; no official API — browser automation required | accepted |
| TC-EXT-02 | Picnic form runs inside **cross-origin JotForm iframe**; agent must switch to iframe context | accepted |
| TC-CAPTCHA-01 | Tennis captcha is **mandatory**; submission without valid code is a hard failure | accepted |
| TC-CAPTCHA-02 | Captcha solving strategy TBD (human-in-the-loop, OCR, third-party); document before implementation | proposed |
| TC-FORM-01 | Field mapping maintained in this PRD § MHOA form field mapping | accepted |
| TC-FORM-02 | Remaining picnic wizard steps (guest count, payment) documented before picnic automation ships | proposed |
| TC-CAL-01 | Tennis uses embedded calendar + dynamic slot list; wait for UI after court/date selection | accepted |
| TC-SIG-01 | Picnic requires canvas **signature**; automation must draw or use approved alternative | accepted |
| TC-TEST-01 | Verification includes stubbed form tests + recorded E2E against live tennis form | proposed |
| TC-STACK-01 | Stack: Next.js 16, React 19, Tailwind 4 — must support Playwright or equivalent automation | accepted |

---

## Out of scope (MVP)

| ID | Item |
| -- | ---- |
| OOS-CAMP-01 | Camping and non-MHOA outdoor providers |
| OOS-INDOOR-01 | MHOA indoor facility bookings |
| OOS-FCFS-01 | First-come-first-served amenities (volleyball, basketball, playground, boat rental) |
| OOS-PAY-01 | In-app payment collection for picnic fee — user completes JotForm payment step unless deferred |
| OOS-ACCT-01 | User accounts, booking history persistence |
| OOS-CANCEL-01 | Automated cancellation via MHOA — MVP shows contact info only |
| OOS-GUEST-01 | Automated guest-list submission 72 h before picnic |
| OOS-RESCHED-01 | Picnic “Rescheduling” path on JotForm step 1 |

---

## Acceptance criteria (MVP done)

1. Resident completes full name, email, phone, address, and NL request for **tennis** on an eligible date.
2. System parses and displays structured intent; user confirms.
3. Agent submits [tennis form](https://mahoganyhoa.com/facilities/outdoor/tennis-courts-3/) with valid captcha.
4. User sees success or specific failure (no slot, rule violation, captcha exhausted, provider down).
5. Same flow defined for **picnic** via JotForm wizard including signature.
6. Requirements IDs referenced in OpenSpec specs and tests for shipped items.

---

## Open questions

| # | Question | Owner |
| - | -------- | ----- |
| 1 | Picnic wizard steps after date/time (guest count field, payment UI) | Eng |
| 2 | Captcha refresh on tennis image click and approved solving approach | Eng / Legal |
| 3 | Picnic signature pad — minimum stroke requirements for validation | Eng |
| 4 | Residency verification — honour system on address vs MHOA lookup | Product |

---

## Revision history

| Date | Change |
| ---- | ------ |
| 2026-07-03 | Initial PRD |
| 2026-07-03 | Live site inspection — tennis calendar/slots, JotForm picnic wizard, updated facility status |
