# Tasks — add-premium-pdf-attach

> Decisions resolved: **D1 = request-scoped** (no at-rest storage — smallest
> security/GDPR surface); **D2 = generation-only** (honesty, fixed); **D3** the
> configured model (`claude-opus-4-8`) supports PDF document blocks (SDK
> `@anthropic-ai/sdk` ^0.109, `DocumentBlockParam` + `Base64PDFSource`).

## 1. Contract + server

- [x] 1.1 Extend the tailoring request with an optional attachment, separate from `cvText` — sent under a dedicated `attachment` field so it can never reach the phase unvalidated (stream-generate.ts; loop.ts `GenerationPhaseInput.attachments`).
- [x] 1.2 `/api/tailor/generate`: read the attachment only after a server-side `hasPaidAccess` check (`attachmentAllowed`); validate PDF type + size cap (before decode + after) + magic-byte sniff; never log bytes (NFR-SEC-01/02, NFR-SEC-04).
- [x] 1.3 Confirmed the configured Claude model supports PDF document blocks (D3); adapter maps the block via `Anthropic.DocumentBlockParam`.

## 2. Generation pass (honesty-critical)

- [x] 2.1 Add the PDF as a document content block to the GENERATION prompt/client only (`shared/lib/llm` types.ts + prompts.ts + claude.ts `toUserContent`).
- [x] 2.2 Grounding pass input shape unchanged (GroundingInput has no attachment field — isolation by construction); added `attachment` to `GROUNDING_FORBIDDEN`.
- [x] 2.3 Adversarial guard: golden trace attaches on generate-bullet only (grades clean); adversarial trace with attachment on ground-bullet trips `grounding-isolation`; route test proves the document block reaches generation and never grounding; overclaim detection unchanged.

## 3. UI + paywall

- [x] 3.1 Attach control in the upload step: paid → offers the uploaded PDF (+ remove, + over-cap note); free/anon → disabled premium affordance.
- [x] 3.2 New `PaywallReason = "attach"`; activating the affordance opens the upgrade surface.
- [x] 3.3 Design-system tokens only, no new hue/emoji/icon library (BC-BRAND-01); no em-dashes; ua+en i18n.

## 4. Verify

- [x] 4.1 `yarn lint` + `yarn build` + `yarn test` green (102 files / 635 tests).
- [~] 4.2 honesty-eval: deterministic grounding-isolation guard green; LIVE eval on the generation prompt change needs `ANTHROPIC_API_KEY` (unavailable in sandbox).
- [~] 4.3 verifier + checker subagents run (maker≠checker). `openspec validate` + archive pending (CLI not installed here).

## 5. Deferred (D1 = persist, future)

- [ ] 5.1 Encrypted `pdf_binary` column (AES-256-GCM, NFR-SEC-01) + GDPR export inclusion + delete cascade, if persistence is chosen later.
