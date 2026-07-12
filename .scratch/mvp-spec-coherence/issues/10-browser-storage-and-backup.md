# 10 — Where the browser keeps the register, and what happens when it loses it

Type: grilling
Status: open
Blocked by: 08

## Question

With no server (map, settled decision 2), the invoice register and both
directories live in the user's browser. `TC-DATA-01` currently hedges — "MVP may
use in-memory or local storage for drafts" — which is not a decision.

Decide:

- **Which API.** `localStorage` (synchronous, string-only, ~5 MB, simple) or
  `IndexedDB` (asynchronous, structured, large, fiddly)? Ticket `08` fixes the
  record shape; size it before choosing.
- **Eviction.** Browsers evict origin storage under pressure, and Safari clears
  it after prolonged non-use. What does the user lose, and are they warned?
- **Clearing site data.** The user's entire invoice history lives behind a menu
  item labelled "clear browsing data". Is an explicit **export / import (JSON)**
  required in the MVP, and is that the whole backup story?
- **Schema migration.** The record shape *will* change. What happens to rows
  written by an older version of the app? Decide the versioning rule now, while
  there are no rows.
- **What `TC-DATA-01` becomes**, stated as a requirement rather than a maybe.

## Note

This is the one place where "no server" genuinely costs the user something. Do
not paper over it in the spec — `BC-UX-01` demands honest failures, and losing a
year of invoices to a cleared cache is the failure that matters most.
