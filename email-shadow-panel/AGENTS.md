# Email Shadow Panel Instructions

## Product

Email Shadow Panel is an anonymous public temporary-inbox application. The MVP has no accounts, registration, login, passwords, user profiles, or cross-device recovery. Emailnator is the only implemented provider. Recent inbox references live in browser `localStorage`, and deployment targets Vercel Hobby.

## Architecture Boundaries

React components must not contain Emailnator endpoints, cookies, XSRF handling, provider response shapes, or provider-specific errors. Vercel route handlers stay thin. Provider behavior belongs under `server/providers/emailnator`, and server-only modules must not enter the frontend bundle.

Validate upstream responses at runtime. Prefer native Node.js `fetch`. Production Redis integration is provisional and only follows a Phase 0 GO verdict.

## Prohibited Architecture

Production must not use Playwright, Chromium, browser automation, browser workers, Oracle infrastructure, unapproved databases, job queues, WebSockets, arbitrary proxy URLs or headers, CAPTCHA or challenge bypass, accounts, login screens, product-user authentication, or speculative multiple-provider support.

A protected development-only Vercel Preview probe token is internal authorization for feasibility work, not product-user authentication.

## Privacy and Security

Use a fixed Emailnator origin. Do not log or commit raw provider cookies, XSRF tokens, capability tokens, session capsules, inbox addresses, message bodies, or personal senders. Use strict request timeouts and response-size bounds. Later phases must sanitize untrusted message HTML, include a provider kill switch, and avoid generic proxy behavior.

## Static and Dynamic Context

This `AGENTS.md` is stable application context. `docs/tasks/` contains dynamic phase-specific context. Completed results belong in verification and process artifacts, not here.

## Engineering Loop

1. Read context.
2. Inspect the repository.
3. Map acceptance criteria.
4. Implement.
5. Run focused checks.
6. Diagnose failures.
7. Fix.
8. Run phase verification.
9. Review against criteria.
10. Record actual results.

## Definition of Done

A phase is done only when acceptance criteria are satisfied, relevant tests exist, verification has run, unrelated files are unchanged, sensitive information is absent, documentation matches actual behavior, and unresolved risks are stated honestly.
