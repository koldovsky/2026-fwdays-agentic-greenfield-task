# Proposal: 3-step booking wizard

## Why

Single-page intake is crowded. Users need a clear flow: **What** → **Who** → **When**, with one slot per person and **independent MHOA submissions** per reservation (FR-WIZ-01).

## What changes

- Step 1 **What:** facility (tennis / picnic)
- Step 2 **Who:** one or **multiple** household members (Max + Nataliia)
- Step 3 **When:** date + availability; **N slot pickers** for N people (sequential continuation)
- Step 4 **Confirm:** review + submit each booking as a separate API request

## Capabilities

- **New:** `booking-wizard`
- **Modified:** `booking-intake`, `court-availability-preview`
