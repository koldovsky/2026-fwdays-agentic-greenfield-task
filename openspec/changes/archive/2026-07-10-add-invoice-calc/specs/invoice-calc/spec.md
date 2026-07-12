## MODIFIED Requirements

### Requirement: FR-CALC-01 Invoice number assignment
The system SHALL assign invoice numbers from a per-supplier, per-year
sequential counter rendered `YYYY-NNN` (zero-padded to three digits, e.g.
`2026-001`). The number SHALL be assigned when the invoice is issued
(`draft → sent`); a draft SHALL carry no number and is addressed by its record
id. The user SHALL be able to edit an assigned number, subject to a uniqueness
check against the register. A cancelled invoice SHALL keep its number, and
that number SHALL never be reused.

#### Scenario: First number of the year
- **WHEN** a supplier issues their first invoice of 2026
- **THEN** the assigned number is `2026-001`

#### Scenario: Sequence advances per supplier
- **WHEN** the same supplier issues a second invoice in 2026
- **THEN** the assigned number is `2026-002`, while another supplier profile's
  next number is unaffected

#### Scenario: Draft has no number
- **WHEN** an invoice is in `draft` status
- **THEN** it has no invoice number and the preview shows a placeholder

#### Scenario: Cancelled number is not reused
- **WHEN** invoice `2026-002` is cancelled and a new invoice is issued
- **THEN** the new invoice receives `2026-003`

#### Scenario: Manual edit collides
- **WHEN** the user edits an assigned number to one that already exists in the
  register
- **THEN** the system rejects the edit and explains the conflict with the
  correct format example

### Requirement: FR-CALC-03 Money model
The system SHALL treat unit price and quantity as the entered values and
derive the line amount as `unit price × quantity` and the invoice total as the
sum of line amounts. All monetary values SHALL be stored and computed as
integer minor units (cents); floating-point arithmetic SHALL NOT be used on
money. Amounts SHALL be displayed with two decimal places in the format
`1,234.56` uniformly across the whole document (both EN and UA lines).

#### Scenario: Line amount derivation
- **WHEN** unit price is 650.00 and quantity is 17
- **THEN** the line amount is 11,050.00 and the printed PRICE × QTY always
  equals the printed AMOUNT

#### Scenario: No division residue
- **WHEN** any unit price and quantity are entered
- **THEN** no division occurs in the money model and totals reconcile exactly

#### Scenario: Uniform formatting
- **WHEN** an amount appears in the Ukrainian line of the document
- **THEN** it is formatted `1,234.56`, identical to the English line

### Requirement: FR-CALC-04 Prepayment and balance
The system SHALL accept prepayment as a percentage (0–100, default 50),
compute `prepayment = round(total × pct)` in integer cents, and compute
`balance = total − prepayment`, such that `prepayment + balance == total`
holds exactly for every input.

#### Scenario: Fifty percent prepayment
- **WHEN** total is 1,000.00 and prepayment is 50%
- **THEN** prepayment is 500.00 and balance is 500.00

#### Scenario: Odd cent is not lost
- **WHEN** total is 0.01 and prepayment is 50%
- **THEN** prepayment + balance equals 0.01 exactly

### Requirement: FR-CALC-06 Payment purpose string
The system SHALL produce payment purpose text:
`Payment by the invoice №{number} from {date_en}` using the assigned
sequential number.

#### Scenario: Purpose string
- **WHEN** invoice number is `2026-001` and English date is `May 03, 2026`
- **THEN** payment purpose is
  `Payment by the invoice №2026-001 from May 03, 2026`

## ADDED Requirements

### Requirement: FR-CALC-05 Payment and execution deadlines
The system SHALL accept the payment term and the execution term as a number
of days, a number of weeks, or an explicit date, and SHALL compute the
resulting deadline dates from the invoice issue date. Computed deadlines SHALL
be rendered bilingually consistent with FR-CALC-02.

#### Scenario: Term in days
- **WHEN** the issue date is 2026-05-03 and the payment term is 3 days
- **THEN** the payment deadline is 2026-05-06

#### Scenario: Term in weeks
- **WHEN** the issue date is 2026-05-03 and the execution term is 5 weeks
- **THEN** the execution deadline is 2026-06-07

#### Scenario: Explicit date passes through
- **WHEN** the user supplies an explicit deadline date
- **THEN** that date is used verbatim and validated to be on or after the
  issue date
