## Context

Samsung's IP Control protocol is JSON-RPC 2.0 over HTTPS on ports 1515/1516; auth is via an `AccessToken` obtained through a pairing handshake documented in `docs/samsung-ip-control-protocol/HTV_IPControl_Protocol_20251120_v.2.8.pdf`. Do not re-derive the wire format each time — the `samsung-ip-control-protocol` skill has it. `AGENTS.md` mandates: one keep-alive HTTPS agent per TV; serialize state-changing commands per TV; never batch; log the JSON-RPC `id` on request and response; strip the token from logs; map every raw `-32xxx` code into the domain error union.

`upnp-tv-discovery` supplies the UDN → `{ ip, port }` mapping. `platform-foundation` supplies transport, error envelope, and logger. This change wires them into a per-TV session.

## Goals / Non-Goals

**Goals:**
- One live session per TV, keyed by UDN, that survives brief network flaps.
- A single serialization point for state-changing commands so we never race the TV.
- Clean, testable error taxonomy so downstream command capabilities only need to say "did this command succeed?"
- Front-end never sees a token, never sees a raw `-32xxx`.

**Non-Goals:**
- User-facing pairing UI. MVP prints the pairing prompt on the TV screen; the user hits "Allow" on the remote. The token appears in the back-end log line and is persisted. Fine for a home LAN.
- Auto-refresh of a revoked token — first failure prompts a re-pair.
- Any command dispatch. Only "session is up" or "session is down."
- Encrypted token storage. `~/.mytv/tokens.json` with `0600`. See risks.

## Decisions

### D1 — Per-TV session actor

Each session runs as a small actor keyed by UDN:

```
type SessionState =
  | { kind: "Disconnected" }
  | { kind: "Connecting"; since: number }
  | { kind: "Connected"; since: number }
  | { kind: "Reconnecting"; since: number; attempt: number }
  | { kind: "Offline" };
```

State transitions:

```
       ┌────────────────┐
       │ Disconnected   │◀─────────┐
       └───────┬────────┘          │
      connect  │                   │  disconnect / max retries
               ▼                   │
       ┌────────────────┐  ok  ┌───┴──────────┐
       │  Connecting    │────▶ │  Connected   │
       └───────┬────────┘      └───────┬──────┘
     err/timeout                        │  unexpected close
               │                        ▼
               │                 ┌────────────────┐
               │                 │ Reconnecting   │
               │                 └───────┬────────┘
               │            ok                  │  attempts > cap
               └───────────────────────▶ Connected
                                                │
                                                ▼
                                         Disconnected

    ── from any state, discovery says offline ──▶ Offline
    ── discovery says online after Offline ──▶ Disconnected
```

Reconnect uses exponential backoff (200 ms, 500 ms, 1 s, 2 s, 5 s) capped at 5 attempts. After the cap, we transition to `Disconnected` and stay there until the user hits `POST /api/devices/:udn/connect` again.

### D2 — Keep-alive HTTPS agent per TV

`undici.Pool` scoped to the TV's origin (`https://ip:port`), with `keepAliveTimeout: 30_000` and `keepAliveMaxTimeout: 300_000`. One pool per UDN, torn down on `Disconnected` transition. This matches the `AGENTS.md` house rule "one keep-alive HTTPS agent per TV."

### D3 — Command queue per TV (serialization)

Every state-changing call goes through a per-session FIFO queue (concurrency 1). Read-only calls that the protocol marks idempotent (`getVolume`, `getSource`) may run in parallel — those live in later capabilities. In this change, only the pairing handshake and the heartbeat go through the transport, and both are trivially serial.

**Alternative considered:** allow parallel commands with hope-for-the-best ordering. Rejected — Samsung documents that batching is not guaranteed and command reordering has been observed in the field.

### D4 — AccessToken storage

`~/.mytv/tokens.json` (XDG-compliant: prefer `$XDG_CONFIG_HOME/mytv/tokens.json` if set) with `0600` permissions. Content is a `Record<UDN, string>`. Loaded once on process start; updated on every successful pairing. On write, `fs.chmod(0o600)` after `writeFile`. If the file is missing or unreadable, start empty and re-pair on connect.

Encryption at rest is not in scope — the device is a single-user Orange Pi on a home LAN (`BC-01/BC-03/BC-04/BC-05`), and adding key management for a device without user accounts is more attack surface than the token is worth. Documented risk below.

### D5 — Error taxonomy

Mapping `-32xxx` → domain code, defined once in `back-end/src/tv/errors.ts`:

| Raw code        | Meaning (from spec)       | Domain code       |
| --------------- | ------------------------- | ----------------- |
| socket error / timeout | connect failed     | `TvNotReachable`  |
| `-32601`        | method not found          | `TvNotSupported`  |
| `-32000..-32099` | server error / generic   | `TvFailed`        |
| `-32602`        | invalid params            | `TvInvalidOp`     |
| any other       | unknown                   | `TvUnknown`       |

Each domain code has a fixed HTTP status: 502 / 501 / 500 / 400 / 500 respectively.

**Never** put the raw `-32xxx` in the response body; log it at level `warn` alongside the JSON-RPC `id` for correlation.

### D6 — Front-end contract

- `GET /api/devices/:udn/session` → `{ state: "Disconnected" | "Connecting" | "Connected" | "Reconnecting" | "Offline" }`. Not `Reconnecting` as a first-class client concern — collapse it to `Connecting` in the response so the UI stays simple.
- `POST /api/devices/:udn/connect` → initiates pairing if no token yet; otherwise attempts session start. Returns the current state.
- `POST /api/devices/:udn/disconnect` → tears down the session; state becomes `Disconnected`.
- WebSocket: `{ topic: "devices", event: "session", udn, state }` on every transition.

`useDeviceSession(udn)` returns `{ state, connect(), disconnect() }` and drives the `disabled={state !== 'Connected'}` policy on downstream command buttons (`FR-REMOTE-04`).

## Risks / Trade-offs

- [Plain-text token on disk] → Documented; the machine is single-user LAN-only. Anyone with `ssh` on the Pi already controls everything. If someone screams later, we add libsecret / macOS Keychain integration behind a flag.
- [Token pairing UX is bad] → MVP prints one line to the log; user watches the TV screen and hits Allow with the physical remote. Good enough for a home LAN; a proper pairing UI is on the follow-up backlog.
- [Session survives a TV reboot but the token is invalidated silently] → First subsequent call maps to `TvNotReachable` or `TvFailed`; the session transitions to `Disconnected` and we prompt re-pair. Acceptable; no worse than any USB pairing product.
- [Race between discovery marking a TV `offline` and a live session] → When discovery emits `offline` for a UDN that has an active session, tear the session down (its heartbeat would fail anyway) and transition to `Offline`. Do it via a single subscription in `manager.ts`.
- [`SessionState` union in TS gets mirrored in three places (back-end, WebSocket type, front-end hook)] → Consolidate the union into a single `back-end/src/tv/types.ts`; front-end mirrors it in a small module, no shared package for now. Kept intentionally small.

## Migration Plan

None — first session capability. Rollback: revert; discovery still works, but no TV can be controlled. `platform-foundation` and `mdns-advertisement` remain functional.

## Open Questions

- Where do we surface the "pairing needed, look at the TV screen" prompt in the UI? Deferred — leaks into `error-surfacing`'s domain. For now, the state stays `Connecting` for as long as pairing is in progress, and the log line has the guidance.
- Do we want a `Reconnecting` badge state in the UI? Design says no — collapse to `Connecting`. Revisit if user testing shows people are confused.
