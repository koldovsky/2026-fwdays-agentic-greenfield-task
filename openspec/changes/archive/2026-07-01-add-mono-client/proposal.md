## Why

`jarsplit` must resolve plan jar names against the user's real monobank jars before
it can build any send links. That resolution needs one authenticated, rate-limited
call to monobank's `client-info` endpoint, plus an offline fixture path so the rest
of the pipeline (matching, link generation, output) can be built and tested without
touching the live, rate-limited API. Nothing in the repo talks to monobank yet.

## What Changes

- Add a `mono-client` capability that fetches `client-info` from
  `https://api.monobank.ua/personal/client-info`, authenticated via the
  `X-Token: $MONO_TOKEN` header, and exposes the parsed `jars[]` array
  (`title`, `sendId`, `currencyCode`) to callers.
- Enforce exactly one HTTP call per run, with a bounded (~10s) timeout.
- Read the token only from the `MONO_TOKEN` environment variable; never write,
  log, or echo it, even partially.
- Return a small, distinct error taxonomy the caller can match on: missing token,
  `401` invalid/expired token, `429` rate-limited, and network/timeout unreachable.
  No auto-retry.
- Support a `MONO_CLIENT_INFO_FILE` fixture override: when set, the client reads
  jar data from that local JSON file instead of calling the network, so downstream
  capabilities and tests never depend on the live API.
- Resolution sits behind a small interface (e.g. `FetchJars`) so `cli-orchestration`
  and tests can inject either the live client or the fixture-backed one.

## Capabilities

### New Capabilities
- `mono-client`: fetches and parses monobank `client-info`, owns auth/transport/
  timeout, the fixture override for offline testing, and the fatal-error taxonomy
  for token/rate-limit/network failures.

### Modified Capabilities
(none — `plan-parsing` is unaffected by this change)

## Impact

- New package, e.g. `internal/monoclient`, with no dependency on `internal/planparsing`.
- New env vars consumed: `MONO_TOKEN` (required for live calls), `MONO_CLIENT_INFO_FILE`
  (optional, test/fixture override).
- Uses only the standard library (`net/http`, `encoding/json`, `context`) per
  TC-DEP-01 — no new third-party dependencies.
- Downstream capabilities (`jar-matching`, `cli-orchestration`) will depend on this
  package's exported `Jar` type and `FetchJars` interface once they're built.
