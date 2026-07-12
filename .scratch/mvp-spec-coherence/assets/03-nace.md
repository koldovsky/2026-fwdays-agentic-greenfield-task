# 03 — When NACE 2.1-UA takes effect, and whether an invoice prints the code

Research asset for ticket
[`03-nace-effective-date-and-code-display`](../issues/03-nace-effective-date-and-code-display.md).

Every claim below is either **VERIFIED** against a primary source (named inline)
or explicitly marked **UNVERIFIED**. Ukrainian statutory text is quoted verbatim.

Primary sources used:
- `docs/191_2025.pdf` — the approved classification appendix (ЗАТВЕРДЖЕНО to
  order No. 191). Extracted with `pdftotext -layout`; line numbers below refer
  to that extraction.
- Держстат order page: `https://stat.gov.ua/uk/page-contents/nakaz-vid-28102025-no191`
- Держстат explainer: `https://stat.gov.ua/uk/news/nova-systema-klasyfikatsiyi-vydiv-ekonomichnoyi-diyalnosti-rozbyrayemos-razom`
- Держстат implementation hub: `https://stat.gov.ua/uk/pages/vprovadzhennya-nace-21-ua`
- The classification PDF re-hosted by Держстат: `https://stat.gov.ua/sites/default/files/2025-11/191_2025.pdf` (byte source of the local copy).

---

## 0. Re-confirmed charting facts (not re-derived)

All four verified against the local PDF text.

- **Order identity** (p.6–10): "ЗАТВЕРДЖЕНО / Наказ Державної служби статистики /
  28 жовтня 2025 № 191", title "КЛАСИФІКАЦІЯ ВИДІВ ЕКОНОМІЧНОЇ ДІЯЛЬНОСТІ
  (NACE 2.1-UA)". **VERIFIED.**
- **Replaces ДК 009:2010** (p.36): "На заміну національного класифікатора
  ДК 009:2010 «Класифікація видів економічної діяльності», затвердженого наказом
  Держспоживстандарту від 11 жовтня 2010 року № 457 (із змінами)." **VERIFIED.**
- **651 class codes** — two independent confirmations: the structural statement
  (p.177) "NACE 2.1-UA має ієрархічну структуру, яка відповідає структурі
  NACE Rev. 2.1 і складається із 22 секцій, 87 розділів, 287 груп і 651 класу.",
  and a mechanical count of `XX.XX` lines in the class table = **651**. **VERIFIED.**
- **Seed codes exist with the quoted names** (class table): 59.12 "Компонування
  кіно- та відеофільмів, телевізійних програм" (p.1473); 74.11 "Діяльність із
  дизайну промислової продукції та одягу" (p.1720); 74.12 "Діяльність із
  графічного та візуального дизайну" (p.1721); 74.13 "Діяльність із дизайну
  інтер’єру" (p.1722); 74.14 "Інша спеціалізована діяльність із дизайну"
  (p.1723). **VERIFIED.**
- **No "набирає чинності" clause in the PDF** — `grep` for `набира`/`чинн`
  returns nothing except an unrelated class name (95.24, p.2074). **VERIFIED.**
  The reason is structural (see Q(a)): the PDF is only the *approved
  classification*, not the *operative order*. The effect clause lives in the
  order body, which is not part of the appendix.

---

## Q(a) — Effective date and transition

**Answer: NACE 2.1-UA is introduced into effect from 1 January 2027, not 2025.
2025–2026 is a preparation/transition window in which ДК 009:2010 (КВЕД-2010)
remains the operative classifier. VERIFIED against the Держстат order page.**

The effect clause is in the operative body of order No. 191 (the part that
approves the appendix), verbatim from the Держстат order page:

> «затвердити Класифікацію видів економічної діяльності (NACE 2.1-UA), що
> додається, та ввести її в дію з 01 січня 2027 року.»

The Держстат explainer restates it in plain terms:

> «Із 1 січня 2027 року Україна переходить на нову класифікацію видів
> економічної діяльності – NACE 2.1-UA»

So `docs/product-brief.md:75` — "From **2025**, Ukraine uses NACE 2.1-UA" — is
**wrong**. In 2025 the classification was only *approved and published*; it is
not *in force* until 2027-01-01. The correct statement is: "approved 28 Oct
2025 by Держстат order No. 191; **in force from 1 January 2027**; ДК 009:2010
(КВЕД) remains the operative classifier until then."

Transition governance: the phased action plan is a separate Держстат order,
No. 244 of 25 Dec 2025 (`https://stat.gov.ua/uk/page-contents/nakaz-vid-25122025-no244`).
The order body of No. 191 contains **no dated sunset clause for ДК 009:2010**
— it approves NACE 2.1-UA and sets its effect date; the *appendix preamble*
says it is issued "на заміну" ДК 009:2010. The replacement therefore takes
effect together with the 2027-01-01 introduction, not before.

---

## Q(b) — What the ЄДР register holds today (2026-07)

**Answer: today a ФОП's ЄДР entry still carries a legacy КВЕД (ДК 009:2010)
code, not a NACE 2.1-UA code. An invoice that prints a NACE 2.1-UA code today
will NOT match the entrepreneur's registration.** Core fact VERIFIED from the
primary effect date; the operational detail (no switch mechanism live yet) is
corroborated by secondary accounting sources only.

This follows directly from Q(a): a classifier that enters force on 2027-01-01
cannot be the classifier of record before that date, so during 2026 the ЄДР and
all registration/reporting/taxation run on ДК 009:2010. Держстат's own
explainer says the conversion will be mostly automatic and needs no user action
for most subjects:

> «Для більшості підприємств зміни відбудуться автоматично – без потреби у
> додаткових діях.»

That automatic conversion is scheduled to the 2027 introduction, not now. The
operational detail that Дія / the state registrar / a notary currently offer
**no** way to register a NACE 2.1-UA code — i.e. as of mid-2026 the register is
still purely КВЕД-2010 — is stated by multiple Ukrainian accounting/legal
sources (buhgalter911, deju.com.ua, avs.ua) but I could not pin it to a single
statutory line, so mark that specific "mechanism not yet live" detail
**UNVERIFIED** as to its exact source. The conclusion it supports is safe: the
register does **not** hold NACE codes today.

Consequence for the product: any "the code on the invoice matches my
registration" reasoning is false in 2026, and the mapping the brief asserts
(legacy 74.10 → new 74.12/74.14) is a *future* correspondence, not today's
register state.

---

## Q(c) — Does an invoice legally have to print the activity code?

**Answer: No. Printing the activity code on an invoice is neither a legal
requirement nor an established Ukrainian convention — for this product it is an
invention. `FR-NACE-06` should be dropped (or made an optional, off-by-default
UI affordance), because the frozen template cannot host it and no law asks for
it. VERIFIED — including a direct statutory disclaimer inside the classification
itself.**

Three independent grounds:

1. **The classification disavows legal effect of the code.** The PDF states
   verbatim (p.142–143):

   > «Слід мати на увазі, що код виду економічної діяльності не створює прав чи
   > обов’язків для суб’єктів.»

   and (p.144–150):

   > «Код виду діяльності не обов’язково достатній критерій для виконання умов,
   > передбачених нормативно-правовими та законодавчими актами. Під час
   > оформлення відносин шляхом укладання угод чи інших актів код виду
   > діяльності, визначений суб’єктом за NACE 2.1-UA, може розглядатися лише як
   > припущення, а не доказ.»

   A code that "creates no rights or obligations" and is "only an assumption,
   not proof" when relations are formalised through contracts/acts cannot be a
   mandatory invoice requisite.

2. **A рахунок-фактура (invoice) has no statutory activity-code requisite.** A
   рахунок is generally not even a primary accounting document; it becomes one
   only if it carries the mandatory requisites of a primary document (name of
   document, name of the issuing entity, content and volume of the operation,
   signatures/positions of responsible persons) per art. 9 of the Law on
   Accounting, confirmed by Мінфін letters (e.g. 24.03.2023 № 41010-06-5/7983).
   The activity code (КВЕД/NACE) is **not** in that list. Source: Factor / Мінфін
   summaries — secondary, but the absence of a code requisite is not disputed
   anywhere. FR-NACE-06's phrase "audit trail for FOP activity type" is not a
   recognised legal concept for an invoice.

3. **The template cannot host it.** `docs/invoice-template.html` has no
   NACE/КВЕД/code placeholder. Its `{{...}}` placeholder set (verified by grep)
   is: INVOICE_NUMBER, INVOICE_DATE_EN/UA, PLACE_EN/UA, CUSTOMER_*, SUPPLIER_*,
   SERVICE_ROWS, PROJECT_BLOCK, the amount/prepayment/deadline text blocks,
   SIGNATORY_*, PAYMENT_DETAILS — **no code field, no code column in
   SERVICE_ROWS**. Because `TC-STACK-03` / `BC-BRAND-01` / `BC-LEGAL-01` freeze
   the template, satisfying FR-NACE-06 would require editing a frozen artifact
   for a field no law requires. **VERIFIED.**

This is the decision this ticket feeds to ticket `09` (document immutability
and NACE display): the NACE code stays a **catalog-internal key that drives
which bilingual service text is inserted**, and does **not** print on the
document.

---

## Q(d) — Can one class code carry more than one invoice line text?

**Answer: Yes, legitimately. A NACE class is a broad grouping of many concrete
services; one class code maps to many possible service descriptions
(one-to-many). Therefore the class code is NOT a unique key for a catalog entry.
The seed table keying two different rows on 74.12 is correct in intent but shows
that `FR-NACE-01`'s "keyed by class code" wording is imprecise. VERIFIED from the
classification's own definition of a class.**

The classification defines a class as an aggregation of enterprises producing
similar goods/services (p.111–114): "Основний принцип NACE 2.1-UA полягає в
об’єднанні підприємств, що виробляють подібні товари чи послуги … у
класифікаційні угруповання, яким надається класифікаційний код." A single class
such as 74.12 "Діяльність із графічного та візуального дизайну" therefore spans
logo design, brand identity, brand book, 2D graphics, 3D visualization points,
etc. — many invoice-line texts under one code.

Modelling guidance for ticket `08`: a catalog entry needs its own identity (its
own id / slug and its bilingual EN+UA line text); the NACE class code is a
**non-unique attribute** of that entry, not its primary key. `FR-NACE-01` should
read "each entry *carries* a NACE 2.1-UA class code", not "entries are *keyed
by* class code".

---

## Provenance of every NACE claim in the two docs

Legend: **CONFIRMED** = matches a primary source; **CORRECTED** = primary source
contradicts it, correction given; **UNSOURCED** = no primary basis found /
product-internal assertion presented as fact.

| # | Claim (location) | Verdict | Note / correction |
| - | ---------------- | ------- | ----------------- |
| 1 | NACE 2.1-UA replaces obsolete KVED DK 009:2010 (`product-brief.md:12–14`) | **CORRECTED** | Replacement is real (PDF preamble "на заміну ДК 009:2010") but "obsolete" is premature — ДК 009:2010 is the **in-force** classifier until 2027-01-01. |
| 2 | 3D/graphics → 74.12; video editing → 59.12 (`product-brief.md:50–53`, `requirements.md:62–64`) | **CONFIRMED** (codes/names) | 74.12 and 59.12 exist with the quoted UA names. The *assignment* of these services to those codes is product design, not a statutory mapping — acceptable as product output. |
| 3 | "From **2025**, Ukraine uses NACE 2.1-UA (order No. 191 of 28 Oct 2025), which replaces DK 009:2010" (`product-brief.md:75–77`) | **CORRECTED** | Order approved 28 Oct 2025; **in force from 1 Jan 2027**. Держстат: "ввести її в дію з 01 січня 2027 року". Replace "From 2025 … uses" with "approved 2025, in force from 2027". |
| 4 | "Codes and labels are updated; some former entries are split" (`product-brief.md:77–78`) | **CONFIRMED** | Держстат published КВЕД-2010 ↔ NACE 2.1-UA correspondence tables; 74.10 splits into 74.11–74.14. Direction of split verified via the class names in the PDF. |
| 5 | Legacy 74.10 → 74.12 / 74.14 mapping table (`product-brief.md:79–83`) | **CONFIRMED** (NACE side) | New-side codes and UA names match the PDF. The legacy→new correspondence is per Держстат's published відповідність tables (not in the PDF); treat the legacy column as informational, not as today's register value (see Q(b)). |
| 6 | 59.12 = "motion picture, video and television programme post-production" (`product-brief.md:83`, `requirements.md:64,77`) | **CONFIRMED** (code + UA name) | Official UA name is "Компонування кіно- та відеофільмів, телевізійних програм". The EN "post-production" is a loose gloss ("Компонування" ≈ editing/compilation); acceptable as invoice-line wording, but it is not a literal translation of the official name. |
| 7 | Classification source is `docs/191_2025.pdf`, original UA (`product-brief.md:85`, `requirements.md:12`) | **CONFIRMED** | Local PDF = Держстат's published appendix to order No. 191. |
| 8 | "NACE, not KVED … legacy KVED references not used" / BC-NACE-01 (`product-brief.md:113–115`, `requirements.md:155`) | **CORRECTED (context)** | Fine as a documentation/UI policy, but factually premature as a real-world claim: through 2026 the ЄДР and reporting still run on КВЕД-2010. Invoices carrying a NACE code will not match registrations until 2027. |
| 9 | FR-NACE-01 — catalog "keyed by NACE 2.1-UA class code (`XX.XX`)" (`requirements.md:61`) | **CORRECTED** | `XX.XX` is indeed the class level (PDF p.183–188). But a class code is **not unique per entry** (Q(d)); reword to "each entry carries a class code". |
| 10 | FR-NACE-02 — 74.12 graphic & visual design (`requirements.md:62`) | **CONFIRMED** | Name matches PDF p.1721. |
| 11 | FR-NACE-03 — 74.12 / 74.14 for 3D visualization (`requirements.md:63`) | **CONFIRMED** (codes/names) | 74.14 = "Інша спеціалізована діяльність із дизайну" (PDF p.1723). Service→code assignment is product design. |
| 12 | FR-NACE-04 — 59.12 post-production (`requirements.md:64`) | **CONFIRMED** (code) | See row 6 on the EN gloss. |
| 13 | FR-NACE-05 — keyword matcher maps service text to NACE entry (`requirements.md:65`) | **UNSOURCED** (n/a) | Pure product behavior; no statutory claim to verify. Survives on product grounds. |
| 14 | FR-NACE-06 — invoice displays NACE code as "audit trail for FOP activity type" (`requirements.md:66`) | **CORRECTED → drop** | No legal requirement (PDF p.142–150: the code "не створює прав чи обов’язків" and is "лише як припущення, а не доказ"); no invoice requisite; frozen template has no placeholder. Recommend dropping FR-NACE-06 or making it an optional off-by-default UI note. Feeds ticket `09`. |
| 15 | Seed table — 4 rows, two keyed 74.12 (`requirements.md:72–77`) | **CONFIRMED** (names) + **CORRECTED** (schema) | All four UA names match the PDF. Two rows on 74.12 is legitimate (Q(d)); the catalog schema must allow many entries per class code. |
| 16 | Out of scope — "Full NACE 2.1-UA taxonomy (651 classes)" (`requirements.md:170`, `product-brief.md`) | **CONFIRMED** | 651 classes (PDF p.177 + mechanical count). |

### Net changes the specs need

- Fix the effective date everywhere: **approved 28 Oct 2025, in force 1 Jan
  2027**; ДК 009:2010 operative until then (rows 1, 3, 8).
- Drop or de-legalise `FR-NACE-06`; the code does not print on the document (row 14) → ticket `09`.
- Re-model the catalog: class code is a non-unique attribute, entries have their
  own identity (rows 9, 15) → ticket `08`.
- Keep BC-NACE-01 as a docs/UI style rule, but stop implying invoice↔register
  code parity in 2026 (row 8).
