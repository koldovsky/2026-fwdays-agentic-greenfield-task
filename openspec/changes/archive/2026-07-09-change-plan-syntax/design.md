## Context

`jarsplit` parses each plan line with `strings.Cut(line, "=")` in
`internal/planparsing/planparsing.go` — name on the left, amount on the right. This
change inverts the fields and swaps the separator to `-` (`<amount> - <jar name>`),
and relaxes amount validation to accept a thousands space (`12 000`). This is a
safety-critical tool (`BC-SAFE-01`: never silently misroute money), so the parsing
contract is decided here before code changes.

## Goals / Non-Goals

**Goals:**
- New grammar `<amount> - <jar name>`, amount first, separator `-`.
- Jar names may contain `-`.
- Amounts may be written with internal spaces as a thousands separator (`12 000`).
- Preserve every other behavior and all downstream stages unchanged.

**Non-Goals:**
- No dual-grammar / backward compatibility with `Name = amount`.
- No change to `Entry`/`Warning`/`Plan` structs, matching, link generation, or the
  output `?a=` URL format.
- No kopiyka/decimal support (still out of scope per `BC-SCOPE-02`).

## Decisions

### D1 — Split on the *first* `-`, amount left, name right
Use `strings.Cut(line, "-")` (splits on the first `-`). The left segment is the
amount, the remainder is the jar name.

- *Why:* Jar names can legitimately contain `-` (`новий-рік`); splitting on the
  first `-` keeps the amount unambiguous (it is a leading numeric token that never
  contains `-`) while letting the name hold any remaining `-`.
- *Alternative rejected:* requiring a literal ` - ` (space-dash-space) delimiter —
  more brittle (breaks on `3000-buffer`) and needs a second rule.
- *Consequence:* A negative amount is impossible by construction — a leading `-`
  makes the left segment empty, which is an invalid amount → malformed.

### D2 — Strip internal whitespace from the amount before parsing
After cutting, `strings.TrimSpace` the amount segment, then remove **all** remaining
internal whitespace (e.g. via `strings.Fields`+join or a whitespace filter) before
`strconv.Atoi`, keeping the `> 0` guard.

- *Why:* The user writes `12 000`; `strconv.Atoi("12 000")` fails. Removing internal
  whitespace yields `12000`. `_`, `,`, and `.` are *not* whitespace, so `1_000`,
  `1,000`, and `100.50` still fail `Atoi` and stay malformed — exactly the intended
  rule.
- *Alternative rejected:* a regex thousands-grouping validator — heavier and would
  start accepting `,`/`.` groupings we deliberately reject.

### D3 — Replace the grammar entirely
Old `Name = amount` lines have no `-`, so they fall through to the
`missing '-' separator` warning and are skipped — no special-casing needed.

- *Why:* Single-user tool; one grammar is simpler and removes ambiguity (a line
  containing both `-` and `=`).

### D4 — Field-check ordering
After a successful cut: validate the amount first, then the name non-empty. A line
missing `-` → `missing '-' separator`; empty name → `empty jar name`; bad amount →
the existing `invalid amount ...` message.

- *Why:* Amount is now the leading field; checking it first reads naturally. Each
  failure keeps a distinct, line-numbered warning (`FR-MALFORMED-01`).

## Risks / Trade-offs

- **[Existing plans break silently-but-loudly]** Real files (`sample-input.txt`,
  gitignored `july 2026.txt`) use the old `=` grammar and will now be skipped. →
  *Mitigation:* they are skipped **with** a `missing '-' separator` warning and a
  non-zero exit — never misrouted; `sample-input.txt` is rewritten to the new format
  as part of this change.
- **[A jar name that is only digits/spaces]** e.g. `3000 - 2026` → name `2026`. This
  is a valid (if odd) name and matches jar titles literally; acceptable, no guard
  needed.
- **[Amount whitespace hides typos]** `1 2 3` → `123`. → *Accepted:* consistent with
  treating spaces as insignificant grouping; the printed `Разом` total and the
  per-line output let the user catch a wrong amount before confirming any payment.
