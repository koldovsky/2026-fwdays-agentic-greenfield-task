# 03 — When NACE 2.1-UA took effect, and whether an invoice prints the code

Type: research
Status: resolved
Blocked by: —

## Question

`BC-NACE-01` ("use NACE 2.1-UA only, never legacy КВЕД") and the whole
`nace-catalog` capability rest on facts that are only partly verified.

**Already verified** against `docs/191_2025.pdf` during charting — re-confirm
the quotes, do not re-derive:

- Держстат order No. 191 of 28 Oct 2025 approves NACE 2.1-UA.
- The preamble states it is "на заміну національного класифікатора ДК 009:2010".
- The document contains exactly 651 class codes in `XX.XX` form.
- `74.11`, `74.12`, `74.13`, `74.14` and `59.12` exist with the names quoted in
  `docs/requirements.md:69-74`.

**Not verified, and load-bearing:**

**(a) Effective date.** The PDF contains **no** "набирає чинності" clause —
grep confirms it. Yet `docs/product-brief.md:75` asserts "From **2025**,
Ukraine uses NACE 2.1-UA". From what date is NACE 2.1-UA actually in force, and
is there a transition period during which ДК 009:2010 remains valid? Primary
sources: the order itself, Держстат publications, `zakon.rada.gov.ua`.

**(b) What the register holds.** As of today (2026-07), does a ФОП's entry in
the ЄДР carry a NACE 2.1-UA code, or still a legacy КВЕД code? If the two can
disagree, an invoice that prints a NACE code may not match the entrepreneur's
registration.

**(c) Does an invoice print the activity code at all?** `FR-NACE-06` requires
the code to appear next to the service description, calling it an "audit trail
for FOP activity type". Is that a legal requirement, a convention, or an
invention? This decides whether `FR-NACE-06` survives — which matters, because
`docs/invoice-template.html` has **no placeholder for a NACE code**, and
`TC-STACK-03` / `BC-BRAND-01` / `BC-LEGAL-01` freeze the template.

**(d) Catalog key.** `FR-NACE-01` says entries are keyed by class code, but the
seed table in `docs/requirements.md:69-74` has **two different rows keyed
`74.12`**. Establish whether a class code can legitimately carry more than one
invoice line text, so ticket `08` can model the catalog correctly.

## Output

A markdown summary at `.scratch/mvp-spec-coherence/assets/03-nace.md`, giving
the provenance of every NACE claim currently made in `docs/product-brief.md`
and `docs/requirements.md`, and marking each as confirmed, corrected, or
unsourced.

---

## Answer

Full working and the provenance table live in
[`assets/03-nace.md`](../assets/03-nace.md). Decisions below are self-contained.

**(a) Effective date — 1 January 2027, not 2025.** Order No. 191 of 28 Oct 2025
only *approved and published* NACE 2.1-UA. Its operative clause (in the order
body, not in the appendix `docs/191_2025.pdf` — which is why grep found no
"набирає чинності") reads, verbatim from the Держстат order page: «затвердити
Класифікацію видів економічної діяльності (NACE 2.1-UA), що додається, та ввести
її в дію з 01 січня 2027 року.» Держстат's explainer: «Із 1 січня 2027 року
Україна переходить на нову класифікацію…». So 2025–2026 is a preparation window;
**ДК 009:2010 (КВЕД) stays the operative classifier until 2027-01-01.** The
brief's "From 2025, Ukraine uses NACE 2.1-UA" (`product-brief.md:75`) is wrong.
Transition is governed by a separate Держстат order, No. 244 of 25 Dec 2025.

**(b) The register today holds a legacy КВЕД code, not NACE.** Because NACE
2.1-UA is not in force until 2027-01-01, a ФОП's ЄДР entry in 2026-07 still
carries a ДК 009:2010 code. Держстат says conversion will be mostly automatic
(«Для більшості підприємств зміни відбудуться автоматично…») but that happens at
the 2027 introduction. **An invoice that prints a NACE 2.1-UA code today would
not match the entrepreneur's registration** — a real mismatch, not a cosmetic
one. (That Дія/registrar offer no NACE registration path yet is stated by
accounting sources; treat the exact citation as UNVERIFIED, the conclusion as
safe.)

**(c) Printing the code on an invoice is an invention — FR-NACE-06 does not
survive.** Three grounds: (1) the classification itself disclaims legal effect —
PDF p.142–150: «код виду економічної діяльності не створює прав чи обов'язків для
суб'єктів» and, in contracts/acts, «може розглядатися лише як припущення, а не
доказ»; (2) a рахунок-фактура has no statutory activity-code requisite (art. 9
Law on Accounting requisites, per Мінфін letters — the code is not among them);
(3) `docs/invoice-template.html` has **no** NACE/code placeholder and no code
column in `{{SERVICE_ROWS}}`, and the template is frozen by `TC-STACK-03` /
`BC-BRAND-01` / `BC-LEGAL-01`. Recommendation: **drop FR-NACE-06** (or demote it
to an optional, off-by-default UI note). The NACE code stays a catalog-internal
key that selects the bilingual service text; it does not print on the document.
This is the input to ticket **`09` (document immutability and NACE display)**.

**(d) One class code can legitimately carry many invoice-line texts.** A NACE
class is a broad grouping of similar activities (PDF p.111–114), so 74.12
"Діяльність із графічного та візуального дизайну" spans logos, brand identity,
brand book, 3D visualization points, etc. The two seed rows keyed on 74.12 are
correct in intent, but they prove the class code is **not a unique key**.
`FR-NACE-01` should read "each entry *carries* a class code", not "entries are
*keyed by* class code": a catalog entry needs its own id, with the NACE class
code as a non-unique attribute. Modelling guidance for ticket **`08`**.
