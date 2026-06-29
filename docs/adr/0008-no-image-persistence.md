# ADR-0008 — No image persistence (privacy)

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §8.3/§8.5/§10, prd.md G5/US-3/US-8*

## Context
Two flows involve images: **plate photos** (food logging) and **body progress photos**. Progress
photos in particular are highly sensitive. Storing them would create a privacy liability, a backup/
deletion burden, and disk usage on a space-and-RAM-tight box — for no functional benefit, since the
useful output is structured macros (food) or qualitative text observations (progress).

## Decision
**Never persist food or body images.** Images are streamed to the Anthropic vision model, processed
in one call, and **discarded immediately** — never written to disk, storage, or the database.
- Food photo → structured items + macro estimates → INSERT; image dropped.
- Progress photo → qualitative text observations only → INSERT; image dropped.

## Consequences
- **+** Minimal privacy/liability surface; no image store to secure, back up, or purge.
- **+** Zero image disk usage on the constrained box.
- **+** Aligns with the broader rule of tight access to sensitive body data.
- **−** No re-analysis: a photo can't be reprocessed later (e.g. with a better model) — only the
  derived text/macros persist. Accepted trade-off.
- **−** Side note: Telegram still retains the file on **its** servers per its own lifecycle —
  outside our control and out of scope.

## Alternatives considered
- **Store images** (even encrypted/TTL'd) — rejected: privacy liability and storage cost outweigh
  the marginal benefit of re-analysis.
