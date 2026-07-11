## ADDED Requirements

### Requirement: Single authenticated client-info call
The system SHALL fetch jar data via exactly one `GET
https://api.monobank.ua/personal/client-info` request per run, authenticated
with the `X-Token` header set to the value of `MONO_TOKEN`. Only the
`jars[]` array of the response SHALL be consumed; `accounts[]` SHALL be
ignored.

#### Scenario: Successful fetch returns parsed jars
- **WHEN** `client-info` responds `200 OK` with a `jars[]` array
- **THEN** the system returns one `Jar` per entry in `jars[]`, and does not
  read or expose `accounts[]`

#### Scenario: Exactly one call is made per run
- **WHEN** a run resolves jar data
- **THEN** at most one HTTP request is issued to `client-info`, regardless of
  how many plan entries need resolving

### Requirement: Token read only from environment
The system SHALL read the token exclusively from the `MONO_TOKEN`
environment variable. The token SHALL never be written to disk, config,
cache, logs, or any error/verbose output, not even partially.

#### Scenario: Token is taken from MONO_TOKEN
- **WHEN** `MONO_TOKEN` is set before the run
- **THEN** its value is sent as the `X-Token` header and is not read from
  any file, flag, or other source

#### Scenario: Missing token is a fatal error, not a network attempt
- **WHEN** `MONO_TOKEN` is unset or empty and no fixture override is active
- **THEN** the system returns `ErrMissingToken` without making an HTTP
  request

#### Scenario: Token never appears in error output
- **WHEN** any fetch error occurs (missing token, invalid token, rate
  limit, network failure)
- **THEN** the returned error's message contains no substring of the token
  value

### Requirement: HTTPS-only transport to the official host
The system SHALL make the `client-info` request over HTTPS only, to
`api.monobank.ua`.

#### Scenario: Request targets the official HTTPS host
- **WHEN** a live (non-fixture) fetch is performed
- **THEN** the request URL scheme is `https` and the host is
  `api.monobank.ua`

### Requirement: Bounded request timeout
The system SHALL bound the `client-info` request with a timeout of
approximately 10 seconds, so a stalled connection cannot hang the run
indefinitely.

#### Scenario: Request exceeding the timeout is treated as unreachable
- **WHEN** the server does not respond before the bound elapses
- **THEN** the system returns `ErrUnreachable` and does not retry

### Requirement: Jar schema fields consumed
The system SHALL parse each `jars[]` entry into a `Jar` exposing `title`,
`sendId`, and `currencyCode`. Monetary fields (`balance`, `goal`) SHALL NOT
be required for parsing to succeed.

#### Scenario: Jar entry is parsed into title, sendId, currencyCode
- **WHEN** a `jars[]` entry contains `title`, `sendId`, `currencyCode`,
  `balance`, and `goal`
- **THEN** the resulting `Jar` exposes `title`, `sendId`, and
  `currencyCode`, and parsing does not fail if `balance`/`goal` are absent
  or malformed

### Requirement: Distinct fatal error per failure condition
The system SHALL distinguish four fatal fetch conditions as distinct,
`errors.Is`-comparable error values: missing token, invalid/expired token
(HTTP `401`), rate-limited (HTTP `429`), and network/timeout unreachable.
The system SHALL NOT automatically retry any of these conditions.

#### Scenario: 401 response yields the invalid-token error
- **WHEN** `client-info` responds `401 Unauthorized`
- **THEN** the system returns an error satisfying `errors.Is(err,
  ErrInvalidToken)`

#### Scenario: 429 response yields the rate-limited error
- **WHEN** `client-info` responds `429 Too Many Requests`
- **THEN** the system returns an error satisfying `errors.Is(err,
  ErrRateLimited)`

#### Scenario: Network failure yields the unreachable error
- **WHEN** the request fails to connect or times out
- **THEN** the system returns an error satisfying `errors.Is(err,
  ErrUnreachable)`

#### Scenario: No automatic retry on any fatal condition
- **WHEN** any of the four fatal conditions occurs
- **THEN** the system returns after the first attempt without issuing a
  second request

### Requirement: Offline fixture override for testing
The system SHALL support a `MONO_CLIENT_INFO_FILE` environment variable
that, when set, causes jar data to be read and parsed from that local JSON
file instead of calling the network. The fixture path SHALL produce the
same `Jar` shape and error taxonomy as the live path, so callers and tests
are agnostic to which is active.

#### Scenario: Fixture file is used instead of the network
- **WHEN** `MONO_CLIENT_INFO_FILE` points to a readable JSON file shaped
  like a `client-info` response
- **THEN** the system parses jars from that file and makes no HTTP request

#### Scenario: Fixture takes precedence over a missing token
- **WHEN** `MONO_CLIENT_INFO_FILE` is set and `MONO_TOKEN` is unset
- **THEN** the system still returns parsed jars from the fixture, without
  raising `ErrMissingToken`

#### Scenario: Unreadable or malformed fixture is a fatal error
- **WHEN** `MONO_CLIENT_INFO_FILE` points to a missing file or invalid JSON
- **THEN** the system returns a fatal error and no jars
