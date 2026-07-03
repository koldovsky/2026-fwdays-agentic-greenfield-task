# Capability: state-persistence

**Wave 1 · foundation.** Thin client-side storage layer used by input and shortlist.

## Purpose
Persist the user's scores, saved list, and application statuses across sessions,
locally and without excess collection.

## Requirements
- FR-STATE-01 — persist scores, list, statuses between sessions.
- TC-STORAGE-01 — client-side `localStorage`; no backend.
- NFR-PRIV-01 — sensitive data stored locally/securely, minimal collection.
- BC-PRIVACY-01 — no third-party analytics on score/benefit data.

## Scope
**In:**
- Typed read/write/clear over `localStorage` with versioned keys.
- Serialization for scores, benefit selections, saved options, statuses.
- Graceful handling of absent/corrupt storage (fresh-start fallback).
- SSR-safe access (no `window` on server).

**Out:** cross-device sync (`cross-device-sync`, Phase 3); the domain data itself.

## Depends on
Nothing structural.

## Consumed by
`score-input`, `shortlist` (and any state that must survive reload).

## Key acceptance
- Scores, saved list, and statuses survive a full page reload.
- No data leaves the device; no analytics calls on sensitive fields.
