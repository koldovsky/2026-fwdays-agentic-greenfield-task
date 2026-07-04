# Tasks — add-premium-pdf-attach

> Blocked on confirming decisions D1 (persist vs request-scoped) and D3 (model
> supports PDF document input) in proposal.md. D2 (honesty: generation-only) is
> fixed. Default assumed: D1 = request-scoped (no at-rest storage).

## 1. Contract + server

- [ ] 1.1 Extend the tailoring request contract with an optional attachment (file part), separate from `cvText`.
- [ ] 1.2 `/api/tailor/generate`: read the attachment only after a server-side `hasPaidAccess` check; validate PDF type + size cap; never log bytes (NFR-SEC-01/02).
- [ ] 1.3 Confirm the configured Claude model supports PDF document blocks (D3); if not, gate the feature off calmly.

## 2. Generation pass (honesty-critical)

- [ ] 2.1 Add the PDF as a document content block to the GENERATION prompt/client only (`shared/lib/llm`).
- [ ] 2.2 Leave the grounding pass input shape unchanged; add the attachment to `GROUNDING_FORBIDDEN`.
- [ ] 2.3 Adversarial honesty-eval fixture: attachment present, assert it never appears in the grounding prompt (grounding-isolation), and overclaim detection is unchanged.

## 3. UI + paywall

- [ ] 3.1 Attach control in the upload step: enabled for paid, disabled + "premium" badge for free/anon.
- [ ] 3.2 New `PaywallReason = "attach"`; activating the disabled control opens the upgrade surface/modal.
- [ ] 3.3 Design-system tokens only, no new hue/emoji/icon library (BC-BRAND-01); no em-dashes in copy; ua+en i18n.

## 4. Verify

- [ ] 4.1 `yarn lint` + `yarn build` + `yarn test` green.
- [ ] 4.2 honesty-eval on the generation prompt change (needs `ANTHROPIC_API_KEY`) + grounding-isolation guard green.
- [ ] 4.3 verifier + checker subagents (maker≠checker); then `openspec validate` + archive.

## 5. Deferred (D1 = persist, future)

- [ ] 5.1 Encrypted `pdf_binary` column (AES-256-GCM, NFR-SEC-01) + GDPR export inclusion + delete cascade, if persistence is chosen later.
