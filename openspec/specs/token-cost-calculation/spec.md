# token-cost-calculation

## Purpose

Convert a Claude model id and token counts into a USD cost via a configurable,
per-model input/output price table seeded with current Anthropic pricing
(FR-USAGE-02, FR-USAGE-04).

## Requirements

### Requirement: Configurable per-model price table

The system SHALL hold the price of each supported Claude model in a configurable price
table, where each entry maps a model id to its input and output price in USD per 1,000,000
tokens. The cost calculation SHALL accept a price table as an argument and SHALL NOT
hard-code prices at the call site, so that prices can change without a code change and so
that a historical price table can be supplied to recompute a past row at the price that
applied when it was recorded (FR-USAGE-02, FR-USAGE-04, TC-AI-02).

#### Scenario: Seed table reflects current Anthropic pricing

- **WHEN** the default seed price table is read
- **THEN** it contains `claude-opus-4-8` at input `$5` / output `$25`, `claude-sonnet-4-6`
  at input `$3` / output `$15`, and `claude-haiku-4-5` at input `$1` / output `$5`, each
  expressed as USD per 1,000,000 tokens

#### Scenario: A custom price table overrides the seed

- **WHEN** the cost is computed with a caller-supplied price table that differs from the
  seed
- **THEN** the computed cost uses the supplied table's prices, not the seed prices

### Requirement: Pure USD cost from model id and token counts

The system SHALL provide a pure, framework-free function that, given a model id, an input
token count, an output token count, and a price table, returns the cost in USD. The cost
SHALL be `(inputTokens / 1_000_000) * inputPricePerMillion + (outputTokens / 1_000_000) *
outputPricePerMillion`. The function SHALL not read environment, network, database, clock,
or DOM, so it is 100% unit-testable (FR-USAGE-02, TC-PURE-01).

#### Scenario: Cost for a known model

- **WHEN** the cost is computed for `claude-opus-4-8` with 1,000,000 input tokens and
  1,000,000 output tokens against the seed table
- **THEN** the result is `30` USD (`5` for input plus `25` for output)

#### Scenario: Zero tokens cost nothing

- **WHEN** the cost is computed for any seeded model with `0` input and `0` output tokens
- **THEN** the result is `0` USD

#### Scenario: Input and output are priced independently

- **WHEN** the cost is computed for `claude-sonnet-4-6` with 2,000,000 input tokens and
  500,000 output tokens against the seed table
- **THEN** the result is `13.5` USD (`6` for input plus `7.5` for output)

### Requirement: Validated inputs and unknown-model handling

The price table and token counts SHALL be validated at the boundary with Zod, and the
TypeScript types SHALL be inferred from those schemas via `z.infer` (TC-VALID-01, TC-TS-01).
Token counts SHALL be non-negative integers. When a model id is not present in the supplied
price table, the function SHALL fail explicitly rather than silently returning a zero or
guessed cost.

#### Scenario: Unknown model id is rejected

- **WHEN** the cost is computed for a model id that is absent from the supplied price table
- **THEN** the function fails explicitly (it does not return `0` or a guessed cost)

#### Scenario: Negative or non-integer token count is rejected

- **WHEN** the cost is computed with a negative or non-integer input or output token count
- **THEN** the input is rejected by validation before any cost is computed
