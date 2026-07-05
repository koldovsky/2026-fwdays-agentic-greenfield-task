# Email Shadow Panel MVP Specification

## Status

Approved before implementation

## Problem Statement

Temporary inbox providers expose their own interfaces, but Email Shadow Panel aims to provide a focused, polished, anonymous experience for generating a temporary inbox, receiving messages, and copying verification codes without creating an account.

## Target Users

The initial audience is the project owner and a small group of friends using a public anonymous deployment. The product does not introduce accounts or identity recovery.

## Primary User Flow

1. A visitor opens the application.
2. The visitor generates an inbox.
3. The visitor copies the generated address.
4. The visitor receives messages at that address.
5. The selected inbox refreshes automatically.
6. The visitor can manually refresh the inbox.
7. The visitor opens an individual message.
8. Verification codes are detected and can be copied.
9. Recent browser-local sessions can be restored in the same browser.
10. The visitor can remove a local application session.

## Functional Requirements

- Emailnator is the only implemented provider.
- Several recent inboxes may exist per browser within configured limits.
- Only the selected inbox auto-refreshes.
- Message lists and individual message details are available.
- OTP and verification-code extraction is supported.
- Error and Retry states are visible for provider and network failures.
- Application sessions expire after inactivity.
- Removing a session deletes Email Shadow Panel's temporary state only.
- The product must not claim provider-side inbox deletion or cleanup.

## Anonymous Ownership Model

- A random browser visitor identifier may be stored locally.
- Browser `localStorage` stores recent inbox references.
- Later phases may issue server-side capability tokens for inbox access.
- Capability tokens must not be recoverable from hashes stored server-side.
- There is no cross-device recovery.
- Losing browser storage means losing access to local session references.
- Visitor and network signals may be used for abuse limits.

## Non-Functional Requirements

- Compatible with Vercel Hobby.
- Polling must be conscious of free-tier limits.
- Provider requests use short timeouts.
- Runtime schemas validate request and provider response shapes.
- Server state is temporary.
- Provider integration remains isolated and maintainable.
- The application fails safely when Emailnator changes.
- The existing responsive frontend remains the baseline.

## Security and Privacy Requirements

- Use a fixed upstream origin.
- Store capability tokens only as hashes.
- Encrypt provider state before external persistence.
- Do not log sensitive provider state, inbox addresses, personal senders, or message bodies.
- Treat message HTML as untrusted input.
- Apply rate limits and active-inbox limits.
- Provide a provider kill switch.
- Do not bypass provider restrictions, CAPTCHA, challenges, or access controls.

## Deployment Requirements

- Deploy on Vercel Hobby.
- Use Vercel Node.js Functions.
- Use native Node.js `fetch`.
- Use Upstash Redis Free only after feasibility approval.
- Require no paid service for the MVP.
- Do not use Playwright in production.

## Explicit Non-Goals

- Accounts.
- Registration.
- Login.
- Cross-device recovery.
- Permanent message storage.
- Multiple providers.
- Commercial use.
- Guaranteed provider availability.
- CAPTCHA handling.
- Browser automation.
- WebSockets.
- Background workers.
- Advanced analytics.

## Product Acceptance Criteria

- A public deployment can generate an Emailnator inbox.
- The generated address can be copied.
- The selected inbox can refresh automatically and manually.
- At least one received message can be listed and opened.
- Verification codes are detected and copyable when present.
- Recent sessions restore from the same browser only.
- Session expiration removes application access without claiming provider deletion.
- Abuse limits and active-inbox limits are enforced.
- Provider failures show safe Error and Retry states.
- No account, login, registration, or profile UI exists.

## Process Acceptance Criteria

- Repository and app `AGENTS.md` files are committed.
- Specifications are committed before implementation.
- Tests or evals cover important behavior and failures.
- Verification reports record actual commands and results.
- Independent review is performed.
- CodeRabbit review is collected and remediated as needed.
- A working public deployment is available.
- The pull request description is completed.
- A one-to-two-minute demo video is recorded.

## Definition of Done

Product completion requires the deployed MVP to satisfy the product acceptance criteria with documented operational limits.

Homework-process completion requires visible context engineering, specification-driven development, implementation and verification loops, maker/checker separation, CodeRabbit iteration, real verification evidence, a completed PR, and a demo video.
