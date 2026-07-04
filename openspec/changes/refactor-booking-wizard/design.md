# Design: Booking wizard

## Steps

| Step | Content | Next enabled when |
|------|---------|-------------------|
| 1 What | Facility radio | facility selected |
| 2 Who | Multi-select profiles + optional Other | ≥1 participant |
| 3 When | Date tabs + MHOA slots | each participant has a slot |
| 4 Confirm | Summary + attestation | attestation checked |

## Multi-resident When UX

For `[Max, Nataliia]`:
1. Banner: **Choose slot for Max (1 of 2)**
2. User picks East 9:00–9:45
3. Banner advances: **Choose slot for Nataliia (2 of 2)** — already-picked slots dimmed
4. Continue → Confirm

Each row in Confirm = one independent `POST /api/booking/submit`.

## Household note

MHOA BC-MHOA-TENNIS-02: one booking/household/day — warn when same date, multiple submits.
