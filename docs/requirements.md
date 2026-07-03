# Prokhidnyi

> Find your passing score. An admissions helper for applicants to Ukrainian universities.

The app takes NMT (National Multi-subject Test) results and benefits, computes the competitive score, estimates the chance of a state-funded place with an uncertainty band, and builds a personal shortlist of "where to apply". It replaces the manual Excel analysis.

- **Status:** prototype (MVP features implemented on sample data)
- **Platform:** responsive web (desktop → phone in the browser)
- **Reference concept:** `template/concept.html`
- **Reference implementation:** `template/prototype.html`

---

## 1. Product goal

Getting in with a modest NMT score is an analysis problem, not a verdict. Today families manually collect cutoff scores, compute the competitive score from coefficients, and guess their chances on intuition. The product automates the whole cycle: **from entering scores to a well-founded decision about application priorities.**

**Value proposition:** "Excel that computes, sorts, and advises itself".

## 2. Users

| Persona | Description | Main needs |
|---|---|---|
| **Applicant** (primary) | 17–18 years old | Speed, honesty, clear options, deadlines |
| **Parents** (co-user) | decide together | Cost, city, dormitory, transparent "where the number comes from" |

---

## 3. ID conventions

Every requirement and constraint carries a stable ID: `PREFIX-DOMAIN-NN`.

| Prefix | Meaning | Example |
|---|---|---|
| `FR-*` | Functional Requirement | `FR-SEARCH-01` — user searches a city by name |
| `NFR-*` | Non-Functional Requirement | `NFR-PERF-01` — TTFB < 300 ms |
| `TC-*` | Technical Constraint | `TC-STACK-01` — Next.js 16 App Router |
| `BC-*` | Business / UX Constraint | `BC-PRIVACY-01` — no analytics |

**Status values:** `proposed` · `accepted` · `shipped` · `dropped`.

Domains used below: `INPUT`, `FILTER`, `SCORE`, `DETAIL`, `COMPARE`, `LIST`, `STATE`, `UX` (functional); `PERF`, `A11Y`, `PRIV`, `RESP`, `SYNC` (non-functional); `STACK`, `PLATFORM`, `DATA`, `STORAGE` (technical); `PRIVACY`, `HONESTY`, `LANG`, `DEADLINE` (business/UX).

---

## 4. Functional requirements

| ID | Requirement | Pr. | Status |
|---|---|---|---|
| FR-INPUT-01 | NMT score entry for 4 subjects (3 required + 1 elective) | M | shipped |
| FR-INPUT-02 | 4th-subject choice with filtering of programs that accept it | M | shipped |
| FR-INPUT-03 | Benefit toggles (rural coefficient, quota, special conditions) affecting the score | M | shipped |
| FR-FILTER-01 | Field & city selection to narrow recommendations | S | shipped |
| FR-FILTER-02 | Filter the list by risk category | S | shipped |
| FR-SCORE-01 | Competitive-score calculation from program coefficients + benefits | M | shipped |
| FR-SCORE-02 | Chance estimate in % with an uncertainty band (lo–hi range) | M | shipped |
| FR-SCORE-03 | Grouping recommendations by risk: Reach / Realistic / Safe | M | shipped |
| FR-DETAIL-01 | Program detail: score breakdown, cutoff history by year, advice | M | shipped |
| FR-COMPARE-01 | Compare 2–3 options in a table with an app recommendation | M | shipped |
| FR-LIST-01 | Save options to a personal list | M | shipped |
| FR-LIST-02 | Track application status (Saved → Submitted → Under review → Recommended → Enrolled) | S | shipped |
| FR-LIST-03 | Priority-submission deadline reminder | C | proposed |
| FR-STATE-01 | State persistence between sessions (scores, list, statuses) | M | shipped |
| FR-UX-01 | Empty states with a hint (empty filter / list) | S | shipped |
| FR-SEARCH-01 | Search a university/program by name | C | proposed |

Priority column uses MoSCoW: **M** — must, **S** — should, **C** — could.

## 5. User stories

- **US-1** — As an applicant, I enter my NMT scores and immediately see a list of programs where I can realistically get in. *(FR-INPUT-01, FR-SCORE-02)*
- **US-2** — As an applicant with a benefit, I mark it and see how my competitive score and chances change. *(FR-INPUT-03, FR-SCORE-01)*
- **US-3** — As an applicant, I understand how confident the chance estimate is (a range, not a single number). *(FR-SCORE-02)*
- **US-4** — As parents, we compare 2–3 options by cost, city, and chance in one table. *(FR-COMPARE-01)*
- **US-5** — As an applicant, I save a shortlist and track application statuses. *(FR-LIST-01, FR-LIST-02)*

---

## 6. Chance calculation model

Chance is a logistic function of the difference between the applicant's competitive score and last year's cutoff.

```
competitive_score = Σ(subject_score × subject_weight) × (1 + benefit)

chance% = logistic( competitive_score − last_year_cutoff, k )
          k grows with the number of state-funded seats (more seats → flatter curve)

band    = [ logistic(diff − σ), logistic(diff + σ) ]
          σ — standard deviation of the cutoff over 3 years
```

| Category | Chance | Recommendation |
|---|---|---|
| 🔴 Reach | < 40% | try as one of your priorities |
| 🟡 Realistic | 40–74% | apply as priority 1–2 |
| 🟢 Safe | ≥ 75% | keep as a fallback priority |

> ⚠️ **Disclaimer:** the model is a probability estimate, not a guarantee. It does not account for the live competition of the current year, the broad-priority system, or rule changes. Accuracy depends on data freshness (section 8).

---

## 7. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-PERF-01 | Recalculation of chances and the list is instant on any input change (< 100 ms) | shipped |
| NFR-RESP-01 | Responsive from desktop down to a phone-sized browser window; touch targets ≥ 44px | shipped |
| NFR-A11Y-01 | Understandable to a teen and parents; sufficient contrast, legible fonts, never color-only signals | accepted |
| NFR-PRIV-01 | Scores and benefits are sensitive; stored locally/securely, without excess collection | accepted |
| NFR-SYNC-01 | State syncs across a user's devices (production, requires accounts) | proposed |

## 8. Technical constraints

| ID | Constraint | Status |
|---|---|---|
| TC-PLATFORM-01 | Responsive web only for MVP; no native iOS/Android apps | accepted |
| TC-STACK-01 | Vanilla-CSS design system (`design-system/`), no build step or CSS framework dependency | accepted |
| TC-STORAGE-01 | Client-side `localStorage` for MVP state; no backend | accepted |
| TC-DATA-01 | Depends on an external official admissions dataset; the prototype ships 11 sample universities | accepted |

## 9. Business / UX constraints

| ID | Constraint | Status |
|---|---|---|
| BC-HONESTY-01 | Always show the uncertainty band + disclaimer; never present a chance as a guarantee | accepted |
| BC-PRIVACY-01 | No third-party analytics on score/benefit data | accepted |
| BC-LANG-01 | End-user interface language is Ukrainian; score and date formats to the Ukrainian standard | accepted |
| BC-DEADLINE-01 | Surface admissions deadlines prominently throughout the flow | proposed |

---

## 10. Data requirements

| Dataset | Fields | Source |
|---|---|---|
| Program registry | university, program, city, form, NMT subjects + weighting coefficients | Official admissions data |
| Cutoff scores | values for the last ≥3 years | Official data |
| Seats & cost | number of state-funded seats, tuition price | Official data |
| Benefits | benefit categories and their effect on score/quotas | Regulatory base |

> 🔴 **Critical dependency (TC-DATA-01):** the prototype uses 11 universities as realistic samples, not an official registry. Cutoff scores are illustrative. Production requires connecting an official source with an annual-refresh policy; without it the estimates are unreliable. The freshness date should be visible in the UI.

## 11. Scope

**Within MVP:** NMT score entry and 4th-subject choice · benefits and coefficients · competitive-score calculation · chance estimate with a band · recommendations by risk · comparison · saving a list · status tracking · responsive web.

**Out of MVP scope:** submitting applications into EDEBO · authentication via government services · contract forms and installment plans · creative/special competitions · foreign universities · chat with admissions offices · native iOS/Android apps.

---

## 12. Release plan

- **Phase 1 — MVP (prototype done):** all `shipped` requirements on sample data; responsive web; state persistence.
- **Phase 2 — Real data & refined model:** resolve TC-DATA-01 (official registry), account for the number of seats and quotas in the formula.
- **Phase 3 — Accounts & sync:** NFR-SYNC-01, FR-SEARCH-01, FR-LIST-03, reminders, shared access for parents.

## 13. Acceptance criteria

- [ ] The user enters NMT scores and gets a grouped list in under 3 minutes. *(FR-INPUT-01, FR-SCORE-03)*
- [ ] Marking a benefit instantly changes the competitive score and chances. *(FR-INPUT-03, NFR-PERF-01)*
- [ ] Each recommendation shows a % chance with an uncertainty band and a risk category. *(FR-SCORE-02, BC-HONESTY-01)*
- [ ] The program detail explains the score calculation and shows the cutoff history. *(FR-DETAIL-01)*
- [ ] Comparison works for 2–3 options and gives a text recommendation. *(FR-COMPARE-01)*
- [ ] The saved list and application statuses survive a reload. *(FR-STATE-01)*
- [ ] The interface adapts correctly from desktop to a phone-sized browser window. *(NFR-RESP-01)*

---

## 14. Success metrics (KPI)

| Goal | KPI |
|---|---|
| Excel replacement | ≥ 80% build a list without external spreadsheets |
| Time to result | scores → first list < 3 min |
| Reliability of chance estimate | category matches the outcome in ≥ 75% of cases (post-hoc) |
| Getting to submission | ≥ 60% save ≥ 3 options with priorities |
| Retention during the season | ≥ 40% return to track statuses |

## 15. Risks

| Risk | Mitigation |
|---|---|
| Stale official data | Annual-refresh policy; visible freshness date (TC-DATA-01) |
| Inflated expectations of "chance" | Uncertainty band + disclaimer (BC-HONESTY-01) |
| Admissions-campaign rule changes | Parameterized model and coefficients without a release |
| Seasonality of use | Value before the season (prep) and after (tracking) |
