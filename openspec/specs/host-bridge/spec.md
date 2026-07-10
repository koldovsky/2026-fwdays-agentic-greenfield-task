## Purpose

The `HostBridge` is the single, platform-neutral surface a plugin may interact with. It exposes exactly
three sub-surfaces — `http`, `storage`, and `logger` — and nothing else. The bridge is assembled
per-plugin from injected platform factories (web: `fetch` + permission enforcement, `InMemoryKeyValueStore`,
console logger; native: analogous implementations) so that the same plugin code runs in-process today
and behind a future sandbox proxy. The `core/contracts` interfaces that define the bridge carry no web-only
types (no DOM, no `fetch`, no `window`), enabling native substitution without changing any plugin.

## Requirements

### Requirement: Single plugin surface

A plugin SHALL interact with the host only through a `HostBridge` that exposes exactly `http`,
`storage`, and `logger`, and nothing else — no DOM, no `window`, no `fetch`, no access to app internals
or to any other plugin. Every method reachable through the bridge SHALL be asynchronous from the first
release, so the same plugin code runs in-process now and behind a sandbox proxy later.

#### Scenario: Bridge exposes only the three sub-surfaces

- **WHEN** a plugin is constructed and handed its `HostBridge`
- **THEN** the bridge exposes `http`, `storage`, and `logger`
- **AND** it exposes no other host capability, no DOM/`window`/`fetch` handle, and no other plugin's data

#### Scenario: Bridge methods are async from day one

- **WHEN** the plugin calls any bridge operation (an HTTP send, a storage read/write, a log)
- **THEN** the operation is asynchronous (returns a promise where it yields a value)
- **AND** the identical plugin code is usable both in-process and behind a future sandbox proxy

### Requirement: HTTP client enforces declared network permissions

The bridge's `http` client SHALL permit a request only to an origin covered by the requesting plugin's
declared network permissions, and SHALL refuse a request to an undeclared origin **before any transport
occurs**. A wildcard (`*`) network permission SHALL allow any origin.

#### Scenario: Request to a declared origin is allowed

- **WHEN** a plugin whose permissions include an origin sends an HTTP request to that origin
- **THEN** the bridge performs the request and returns the response

#### Scenario: Request to an undeclared origin is refused

- **WHEN** a plugin sends an HTTP request to an origin it did not declare
- **THEN** the bridge refuses the request with a permission error
- **AND** no network call is made to that origin

#### Scenario: Wildcard permission allows any origin

- **WHEN** a plugin declares network permission `*` and sends a request to an arbitrary origin
- **THEN** the bridge permits the request

### Requirement: Transport and CORS are a host concern

The host SHALL own the HTTP transport behind `http`; on the web build it is implemented over `fetch`,
so CORS and mixed-content are handled by the host and browser, not by the plugin. A plugin SHALL contain
no transport, `fetch`, or CORS-handling code of its own.

#### Scenario: Web build routes plugin HTTP through fetch

- **WHEN** the app runs on the web and a plugin issues an HTTP request through the bridge
- **THEN** the host performs it via `fetch`
- **AND** the plugin code contains no `fetch` call and no CORS handling

#### Scenario: Cross-origin access depends on host allowlisting, not the plugin

- **WHEN** a plugin targets a cross-origin server (e.g. a Komga server) that has not allowlisted the app
  origin in its `KOMGA_CORS_ALLOWED_ORIGINS`
- **THEN** the failure surfaces as a host transport error (the plugin is unchanged and not at fault)
- **AND** the same plugin succeeds once the host origin is allowlisted server-side, or runs CORS-free on
  a native HTTP transport

### Requirement: Per-plugin namespaced storage

The bridge's `storage` SHALL be a key-value store namespaced per plugin id; a plugin SHALL NOT read or
write another plugin's data. Its `get`, `set`, and `delete` operations SHALL be asynchronous.

#### Scenario: A value is isolated to the plugin that wrote it

- **WHEN** plugin A writes a value under a key, then plugin B reads the same key
- **THEN** plugin B's read returns nothing (A's value is not visible to B)

#### Scenario: Round-trip and delete

- **WHEN** a plugin sets a key to some bytes, reads it back, then deletes it
- **THEN** the read returns the stored bytes
- **AND** a read after the delete returns nothing

### Requirement: Attributable logging

The bridge's `logger` SHALL provide `debug`, `info`, `warn`, and `error`; host-recorded log entries
SHALL be attributable to the originating plugin.

#### Scenario: A log entry is tagged with its plugin

- **WHEN** a plugin logs a message at any level
- **THEN** the host records the entry attributed to that plugin's id

### Requirement: Platform-swappable portable bridge

The `HostBridge` contract SHALL be platform-neutral — its interface SHALL declare no web-only types
(no DOM, no `fetch`, no `window`) — so that a native implementation can be substituted without changing
any plugin. The web implementation (`fetch` + browser storage) and a future native implementation
(native HTTP + filesystem) SHALL both satisfy the same contract.

#### Scenario: Swapping the platform implementation needs no plugin change

- **WHEN** the bridge implementation is provided by the web platform layer and later by a native layer
- **THEN** the `HostBridge` contract referenced by plugins is identical in both cases (no web-only types)
- **AND** a plugin written against the contract runs unchanged on either implementation
