# Capability: Multi-Expense Split

## Purpose

Enable the parser agent to recognize and split multi-expense inputs into independent expense objects, with per-expense datetime inference.

---

## Requirements

### Requirement: Parser returns an array of expenses

The parser agent SHALL return a JSON array containing one or more expense objects. Each object SHALL conform to the existing expense schema (amount, currency, category, description, datetime, confidence). Single-expense inputs SHALL yield an array with exactly one element.

#### Scenario: Single expense input returns one-element array
- **WHEN** the user inputs "купив каву за 50"
- **THEN** the parser SHALL return `[{ "amount": 50, "currency": "UAH", "category": "Кафе/Ресторани", ... }]`

#### Scenario: Multi-expense input returns multiple elements
- **WHEN** the user inputs "купив каву за 50 і хліб за 30"
- **THEN** the parser SHALL return an array with two expense objects: one for 50 UAH coffee and one for 30 UAH bread

#### Scenario: Three or more expenses in one sentence
- **WHEN** the user inputs "бензин 200, продукти 150 і кава 40"
- **THEN** the parser SHALL return an array with three expense objects matching each purchase

---

### Requirement: Checker validates each expense independently

The checker SHALL iterate the full array and validate every expense object. It SHALL collect all validation failures before returning and SHALL NOT stop at the first failure.

#### Scenario: One invalid expense in array
- **WHEN** the parser returns an array where the second object has amount = 0
- **THEN** the checker SHALL report the failure for index 1 and still validate all remaining objects

#### Scenario: All expenses valid
- **WHEN** the parser returns an array of two well-formed expense objects
- **THEN** the checker SHALL accept both and pass them to storage

---

### Requirement: Storage inserts one row per expense

The storage layer SHALL insert one database row for each expense object in the validated array.

#### Scenario: Two-expense input creates two rows
- **WHEN** a validated array of two expenses is passed to storage
- **THEN** two separate rows SHALL be inserted, each with independent amount, category, and datetime values

---

### Requirement: LLM applies datetime inference per expense

Each expense in the returned array SHALL have its datetime resolved independently using the shared receipt timestamp and any time cues present in the user text for that specific expense.

#### Scenario: Mixed explicit and relative times in one input
- **WHEN** the user inputs "купив каву о 14:00 і хліб годину тому" with receipt timestamp "2026-06-28T15:00:00"
- **THEN** the coffee expense SHALL have datetime "2026-06-28T14:00:00" and the bread expense SHALL have datetime "2026-06-28T14:00:00" (one hour before receipt)

---

### Requirement: LLM avoids over-splitting combined totals

When the user describes a single combined amount for multiple items, the parser SHALL treat it as one expense rather than splitting by item.

#### Scenario: Combined total for two items
- **WHEN** the user inputs "купив пиво і воду за 30"
- **THEN** the parser SHALL return a single expense object for 30 UAH (not two 15 UAH expenses)
