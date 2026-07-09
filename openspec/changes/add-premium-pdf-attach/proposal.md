# Premium: attach the original PDF to the tailoring request

## Why

Today the CV flow is text-only: the server parses the upload to plain text and
discards the bytes (`features/upload-cv/api/parse-cv-file.ts`). Parsing loses
layout, tables, and sometimes text the extractor misses. Paid users should be
able to attach the original PDF so the generation pass sees the real document,
not just the flattened text. Free users should see the option, disabled, with a
"premium" badge and an upgrade path (FR-PAYWALL-01/02, FR-CV-01, revenue).

The hard constraint is honesty (BC-HONESTY-01/02): widening the model's input
must not let ungrounded claims slip in. So the attachment feeds the **generation
pass only** and never the grounding pass, which stays text-only and remains the
isolated second check.

## What Changes

- **Attach control (paid).** The upload step gains an "attach original PDF"
  option. For free users it renders disabled with a "premium" badge and opens an
  upgrade surface (new `PaywallReason = "attach"`).
- **Server-side entitlement.** The attach is honored only when the server
  confirms paid access (`hasPaidAccess`); a client flag is never trusted. PDF
  only, size-capped, validated; bytes are never logged (NFR-SEC-01/02).
- **Generation pass, multimodal.** When attached, the generation Claude call
  includes the PDF as a document content block alongside the existing text input.
- **Grounding stays text-only.** The grounding pass input keeps its current
  shape; the attachment is added to the `GROUNDING_FORBIDDEN` denylist with an
  adversarial honesty-eval fixture proving it never reaches grounding. Every
  bullet is still grounded against the candidate's own CV text and flagged
  overclaim-risk if it cannot be, exactly as today.
- **Not persisted at rest in v1** (decision D1 below): the PDF is request-scoped.
  Persisting for history re-use is a documented future extension (adds an
  encrypted `pdf_binary` column + GDPR export/delete parity).

## Decisions (defaults; confirm before implementation)

- **D1 — persistence.** Default: request-scoped, do NOT store the PDF at rest.
  Rationale: smallest new security/GDPR surface; the value (better generation) is
  captured without an encrypted-blob column. Alternative: persist encrypted for
  history re-open (larger scope, NFR-SEC-01 + GDPR cascade).
- **D2 — honesty handling.** Default (and only honest option): PDF to generation
  pass only; grounding pass unchanged; overclaim detection unchanged. No bullet
  is exempt from grounding because it "came from the PDF."
- **D3 — model.** Requires a Claude model with document (PDF) input on the
  generation call; confirm the configured model supports it, else gate the
  feature off calmly.

## Capabilities

### New Capabilities

- `premium-attach`: paid-gated attachment of the original PDF to the generation
  pass, with a disabled+badge state for free users and an upgrade path, under the
  honesty constraint that the attachment never reaches the grounding pass.

### Modified Capabilities

- `bullets`: the generation pass MAY receive the original PDF as a document block
  for paid users; the grounding pass remains text-only and isolated.

## Impact

- `features/upload-cv/**` (attach control + parse boundary), `features/run-tailoring`
  + `entities`/request payload (attach field), `shared/lib/llm/**` (document block
  in generation prompt/client; grounding denylist + fixture), `widgets/paywall`
  (new reason + upgrade modal), `src/app/api/tailor/generate` (server entitlement +
  wiring). New migration only if D1 flips to persist. honesty-eval before archive.
