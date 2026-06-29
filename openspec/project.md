# Project — tf-guard

Keyless, offline CLI that risk-ranks `terraform plan -json` policy violations.

- Source of truth: [../docs/requirements.md](../docs/requirements.md) (FR/NFR/TC/BC).
- Specs here describe **capabilities** as behavioural contracts (scenarios).
- A `change/` is a proposed delta to one or more capability specs; once shipped, the
  capability spec under `specs/` reflects the new truth.

Conventions: one capability = one folder under `specs/`. Scenarios use
`WHEN … THEN …`. Each scenario traces to a requirement ID.
