## 1. Package scaffolding

- [x] 1.1 Create the mono-client package under the `md/agentic/monojar` module (e.g. `internal/monoclient`)
- [x] 1.2 Define `Jar{Title string, SendID string, CurrencyCode int}` and the `JarFetcher` interface: `FetchJars(ctx context.Context) ([]Jar, error)`
- [x] 1.3 Define the sentinel fatal errors: `ErrMissingToken`, `ErrInvalidToken`, `ErrRateLimited`, `ErrUnreachable`

## 2. Live HTTP client

- [x] 2.1 Implement an `httpJarFetcher` that builds `GET https://api.monobank.ua/personal/client-info` with header `X-Token: <MONO_TOKEN>`
- [x] 2.2 Read `MONO_TOKEN` at construction/fetch time; return `ErrMissingToken` (wrapped, no network call) when unset or empty
- [x] 2.3 Issue the request with the caller-supplied `context.Context`; map a `401` response to `ErrInvalidToken`, a `429` response to `ErrRateLimited`, and connection/timeout failures to `ErrUnreachable`, each wrapping the underlying error with `%w`
- [x] 2.4 Decode the `200 OK` body's `jars[]` array into `[]Jar` (`title`, `sendId`, `currencyCode`); ignore `accounts[]`, `balance`, `goal`
- [x] 2.5 Confirm no retry path exists: a single request attempt per `FetchJars` call

## 3. Fixture-backed client

- [x] 3.1 Implement a `fixtureJarFetcher` that reads `MONO_CLIENT_INFO_FILE`, parses it with the same `jars[]` decoding as the live path, and makes no HTTP request
- [x] 3.2 Return a fatal error (not a sentinel) when the fixture path is missing or contains invalid JSON
- [x] 3.3 Implement `NewJarFetcher() JarFetcher`: return the fixture-backed fetcher when `MONO_CLIENT_INFO_FILE` is set, otherwise the live HTTP-backed fetcher — checked before any `MONO_TOKEN` validation, so a fixture run never requires a token

## 4. Security and transport guarantees

- [x] 4.1 Verify by test that no returned error's message contains the token value, across all four fatal paths
- [x] 4.2 Verify by test/code review that the live fetcher's request URL is always `https://api.monobank.ua/...` (no override of host/scheme)
- [x] 4.3 Wire the ~10s timeout expectation into the live fetcher via the caller-provided `context.Context` (document that the caller is expected to set the deadline, per design.md decision 5)

## 5. Tests

- [x] 5.1 Table-driven tests for the live fetcher against an `httptest.Server`: 200 success, 401, 429, and a slow/unreachable server triggering `ErrUnreachable`
- [x] 5.2 Test that a 200 response's `jars[]` maps to `[]Jar{Title, SendID, CurrencyCode}` and that `accounts[]`/`balance`/`goal` are ignored without failing decode
- [x] 5.3 Test that `MONO_TOKEN` unset (no fixture) returns `ErrMissingToken` without hitting the network (use a fetcher pointed at a server that fails the test if contacted)
- [x] 5.4 Test `NewJarFetcher()` selects the fixture path when `MONO_CLIENT_INFO_FILE` is set, including when `MONO_TOKEN` is simultaneously unset
- [x] 5.5 Test the fixture path with a missing file and with malformed JSON, both returning a fatal error and no jars
- [x] 5.6 Test that exactly one request is issued per `FetchJars` call against the live fetcher (request counter on the test server)
