# PRD — Prokhidnyi

> Product Requirements Document · v1.0 · Draft

**Prokhidnyi** is a responsive web app that takes NMT (National Multi-subject Test) results and benefits, computes the competitive score, estimates the chance of a state-funded place with an uncertainty band, and builds a personal shortlist of "where to apply". It replaces the manual Excel analysis.

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 02.07.2026 |
| **Status** | Draft |
| **Platform** | Responsive web (desktop → phone in the browser) |
| **Basis** | Interactive prototype · `BR` · `design-system.md` |

---

## 1. TL;DR

Applicants with a modest NMT score manually collect cutoff scores in spreadsheets, compute the competitive score from coefficients, and guess their chances on intuition. Prokhidnyi automates the whole cycle: enter your scores and benefits — get a risk-grouped list of programs with an honest chance estimate, comparison, and application tracking. The MVP is implemented in the prototype on sample data; the key condition for production is an official data source.

## 2. Problem & opportunity

The current approach (Excel + university sites one by one) has four systemic pains:

1. **Manual data.** Cutoff scores are collected from university sites and pasted by hand.
2. **Coefficients.** Each program has its own subject weights — the competitive score is easy to compute wrong.
3. **Benefits.** The effect of coefficients and quotas on your standing is opaque.
4. **Intuition instead of a number.** "Chances" stay a feeling — which breeds anxiety and wrong priorities.

> **Opportunity:** every family recomputes this from scratch each year. One product that does the math automatically and honestly removes the anxiety and saves days of work — "Excel that computes, sorts, and advises itself".

## 3. Goals & non-goals

**Goals**
- Remove the need to keep your own Excel
- Give an honest, understandable chance estimate
- Cut the "scores → list" time to minutes
- Get the user to submission with priorities

**Non-goals (for now)**
- Submitting applications directly into EDEBO
- Guaranteeing admission / an official forecast
- Native iOS/Android apps
- Foreign universities, creative-competition programs

## 4. Personas & Jobs-to-be-Done

| Persona | Role | JTBD |
|---|---|---|
| **Applicant** (17–18) | primary persona | "When I get my NMT scores, I want to quickly understand my real options, so I can apply where I have a chance and not miss a deadline." |
| **Parents** | co-user | "When we choose together, I want to compare options by chance, cost, and city, and understand where the number comes from, so the decision feels calm." |

## 5. Core user flow

| # | Step | Result |
|---|---|---|
| 1 | Enter NMT scores + choose the 4th subject | List filters to available programs |
| 2 | Mark benefits | Competitive score and chances recompute |
| 3 | (Optional) narrow by fields/cities | A shorter, relevant list |
| 4 | Review recommendations, open detail | Understanding of the chance and score math |
| 5 | Add options to compare / save | A shortlist of candidates |
| 6 | Set priorities, track statuses | Ready to submit applications |

---

## 6. Functional specifications

### 6.1 NMT score entry + 4th subject · `MUST`
3 required subjects (Ukrainian, mathematics, history) + 1 elective (English, biology, physics, chemistry, geography, German). Scores 100–200. Changing a score instantly recomputes the whole list. Choosing the 4th subject filters programs that accept it; ineligible ones are marked "different NMT subject".
> ✓ **Acceptance:** the score slider/field updates the competitive score and chances without a reload; changing the 4th subject changes the list composition.

### 6.2 Benefits · `MUST`
Toggles: rural coefficient (×1.02), preferential quota, special conditions (orphans, IDPs, veterans' families). The combined bonus is applied to the competitive score; the current bonus is shown explicitly.
> ✓ **Acceptance:** turning a benefit on raises the competitive score and shifts chances up, visible immediately.

### 6.3 Recommendations · `MUST`
A list of programs sorted by chance. Each card: university name, program·city, chance ring with a percentage, uncertainty band (lo–hi%), last year's cutoff vs your score, "compare" and "save" actions. Grouped by risk: **Reach** / **Realistic** / **Safe**. Filter by category + by fields/cities.
> ✓ **Acceptance:** category and color match the percentage; an empty filter shows a hint.

### 6.4 Program detail · `MUST`
A modal with the competitive-score breakdown (subject × coefficient + benefit), the cutoff history over 3 years, the category, advice, and the chance range. Actions: add to compare, save.
> ✓ **Acceptance:** the breakdown sums to the competitive score; the advice matches the category.

### 6.5 Comparison · `MUST`
Up to 3 options side by side: chance, cutoff, your score, state-funded seats, tuition cost, city, dormitory. At the bottom — a text recommendation (best balance of chance and cost).
> ✓ **Acceptance:** works for 2–3 options; the empty state prompts to add via the ⇄ button.

### 6.6 Saved & application statuses · `SHOULD`
A personal list with priorities. An application's status moves through stages: Saved → Submitted → Under review → Recommended → Enrolled. Deadline banner. State persists between sessions (localStorage; account in production).
> ✓ **Acceptance:** the saved list and statuses survive a page reload.

---

## 7. Chance calculation model

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

> ⚠️ **Disclaimer:** the model is a probability estimate, not a guarantee. It does not account for the live competition of the current year, the broad-priority system, or rule changes. Accuracy depends on data freshness.

## 8. UX & design principles

- **Honesty over optimism.** Uncertainty band and disclaimers instead of promises. Color = verdict, number = detail.
- **Instant feedback.** Any input change recomputes everything live (< 100 ms), with no "calculate" button.
- **Transparent math.** Every coefficient and the cutoff history are visible — "where the number comes from".
- **Understandable to teen and parents.** Lively language, contrast, touch targets ≥ 44px, responsive from desktop to phone in the browser.

Visual system, components, and tokens — in [`design-system.md`](./design-system.md).

## 9. Data & dependencies

- **Program registry:** university, program, city, form, NMT subjects + weighting coefficients.
- **Cutoff scores:** for the last ≥3 years (for the uncertainty band).
- **Seats & cost:** number of state-funded seats, tuition price.
- **Benefits:** a directory of categories and their effect on score/quotas.

> 🔴 **Critical dependency:** the prototype uses 11 universities as realistic samples. Production requires connecting an official source with an annual-refresh policy; without it the estimates are unreliable.

## 10. Success metrics

| Goal | KPI |
|---|---|
| Excel replacement | ≥ 80% build a list without external spreadsheets |
| Time to result | scores → first list < 3 min |
| Reliability | category matches the outcome in ≥ 75% of cases (post-hoc) |
| Getting to submission | ≥ 60% save ≥ 3 options with priorities |
| Retention during the season | ≥ 40% return to track statuses |

## 11. Release plan

- **M1 — MVP on sample data:** all features 6.1–6.6, responsive web, state persistence. **✅ Done (prototype).**
- **M2 — Real data + refined model:** official registry, number of seats and quotas in the formula, freshness date in the UI.
- **M3 — Accounts & sync:** authentication, sync across devices, deadline reminders, shared access for parents.

## 12. Risks & open questions

| Risk / question | Mitigation / decision |
|---|---|
| Stale data | Refresh policy; visible freshness date |
| Inflated expectations of "chance" | Uncertainty band + disclaimer |
| Official data source? | 🔵 Open — decide before M2 |
| Broad-priority model | 🔵 Open — research inclusion in the estimate |

---

*Prokhidnyi · PRD v1.0 · based on the interactive prototype, BR, and design-system.md*
