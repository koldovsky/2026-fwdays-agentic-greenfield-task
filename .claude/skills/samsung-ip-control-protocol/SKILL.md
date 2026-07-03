---
name: samsung-ip-control-protocol
description: Samsung HTV IP Control protocol v2.8 — JSON-RPC 2.0 over HTTPS, ports 1515/1516, AccessToken auth, method catalog (powerControl, directVolumeControl, remoteKeyControl, …), UPnP discovery, error codes. Load ONLY when writing or editing back-end code (back-end/**) that talks to a Samsung TV or handles IP Control frames. Do NOT load for front-end, docs, or general UI work.
---

# Samsung HTV IP Control Protocol v2.8

Authoritative sources in this repo (open them when you need detail beyond this cheat sheet):
- `docs/samsung-ip-control-protocol/HTV_IPControl_Protocol_20251120_v.2.8.pdf` — full spec.
- `docs/samsung-ip-control-protocol/IP CONTROL V2.postman_collection.json` — worked request/response examples.

## When this skill applies

Use when editing `back-end/**` code that:
- opens outbound HTTPS to a Samsung TV,
- encodes/decodes IP Control JSON-RPC payloads,
- handles TV discovery, session state, or error mapping.

Do **not** apply to `front-end/**`, root config, or generic Node advice.

## Transport (spec §1.3, §1.4, §1.5)

- **HTTPS over TLS 1.2** — the TV *is* the server, back-end is the client.
- **Method**: always `POST /` with `Content-Type: application/json` and `Accept: application/json`. HTTP GET is answered with `405`.
- **Port** depends on TV year:
  | TV year   | Port |
  | --------- | ---- |
  | ≤ 2017    | 1515 |
  | 2018–2019 | 1515 |
  | ≥ 2020    | 1516 |
  | Wall Pro / Wall Lux | 1516 |
- **Max concurrent clients per TV: 5.** Design connection pooling with that ceiling.
- **Max HTTP body: 200 KB.** Chunked encoding is supported.
- **Disabled cipher suites** (do not force these — the TV will refuse):
  `TLS_RSA_WITH_RC4_128_MD5`, `TLS_RSA_WITH_RC4_128_SHA`, `TLS_RSA_WITH_SEED_CBC_SHA`, `TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA`, `TLS_RSA_WITH_3DES_EDE_CBC_SHA`.
- TVs use **self-signed certs** — Node's default TLS will reject them. Use a per-TV pinned cert or `rejectUnauthorized: false` on trusted LAN only, and log the fingerprint.

## Discovery (spec §1.2)

- **UPnP SSDP** — device type: `urn:samsung.com:device:IPControlServer:1`.
- Service type: `urn:samsung.com:service:IPControlService:1`, service ID: `urn:samsung.com:serviceId:IPControlService`.
- Manual IP entry must be supported as a fallback (spec explicitly permits it).
- `friendlyName`, `modelName`, `UDN` (uuid) come from the device description XML — use `UDN` as the stable TV identifier, not IP.

## Data format (spec §1.5)

**JSON-RPC 2.0** — every request:
```json
{ "jsonrpc": "2.0", "method": "<name>", "params": { … }, "id": <number> }
```
- `id` must be numeric and unique per in-flight request on a socket.
- Batch requests are **not guaranteed** to work on the TV — send one at a time.
- Notifications are unnecessary; every call gets a response.

Every response:
```json
{ "jsonrpc": "2.0", "result": <value>, "id": <same id> }
```
or
```json
{ "jsonrpc": "2.0", "error": { "code": <int>, "message": "…", "data": "…" }, "id": <same id> }
```

HTTP status is `200 OK` for both success **and** JSON-RPC errors. Do not treat a 200 as success — read `result` vs `error` in the body.

## Authentication

Every method's `params` includes `"AccessToken": "<token>"`. Confirmed in every entry of the Postman collection.
- Token is per-TV, provisioned out-of-band (hotel management / installer).
- Store per-TV in back-end config; never log it.

## Method catalog (spec §3.1)

Grouped by section number in the PDF — open the PDF for exact param shapes.

| PDF § | Method                | Notes                                    |
| ----- | --------------------- | ---------------------------------------- |
| 3.1.1 | `powerControl`        | `params.power = "on" | "off" | "reboot"`; empty → returns current state |
| 3.1.2 | `directVolumeControl` | `params.volume = 0..100`; empty → get    |
| 3.1.3 | mute control (via `directVolumeControl` / dedicated method — check spec) |
| 3.1.4 | Channel control       |                                          |
| 3.1.5 | Source control        | input switching                          |
| 3.1.6 | Picture control       |                                          |
| 3.1.7 | Sound control         |                                          |
| 3.1.8 | Status                | health / current state                   |
| 3.1.9 | `remoteKeyControl`    | `params.remoteKey = "<KEY_NAME>"` (e.g. `cursorUp`, `enter`, `menu`) |
| 3.1.10 | App control          | launch apps                              |
| 3.1.11 | First Screen App     |                                          |
| 3.1.12 | Art Mode             |                                          |
| 3.1.13 | MultiView            |                                          |
| 3.1.14 | Display Rotator      |                                          |
| 3.1.15 | Hotel TV             | HTV-specific menu / lock / channel-list operations |

Copy exact `params` shapes from the Postman collection — it is the ground truth for field names and casing (camelCase throughout).

## Error handling (spec §1.6)

Server-defined error codes (in addition to standard JSON-RPC `-32600` / `-32601` / `-32700`):

| Code   | data              | Meaning                                    |
| ------ | ----------------- | ------------------------------------------ |
| -32000 | Unknown           | TV-side unknown error                      |
| -32001 | Not supported     | Method not supported on this TV/firmware   |
| -32002 | Failed            | Command reached TV but execution failed    |
| -32003 | Invalid operation | Bad params / illegal state (e.g. cursorUp in wrong context) |

**Never surface raw `-32xxx` codes to the front-end.** Map to a domain error union (`TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`) so the UI can react without hard-coding numeric codes.

## Implementation guardrails for back-end code

1. **One TCP/TLS agent per TV** with `keepAlive: true` — the TV is a small embedded HTTPS server; reconnect churn is expensive and burns one of the 5 client slots.
2. **Serialize requests per TV** or bound concurrency to ≤ 5. Also serialize state-changing commands (`powerControl`, `remoteKeyControl`) to avoid interleaved state.
3. **Timeouts**: TVs on Wi-Fi can lag; use a request timeout ≥ 3 s and reconnect with exponential backoff (spec §risks — Wi-Fi instability is called out in `docs/product-brief.md`).
4. **Stable TV identity = `UDN` (uuid)**. IPs churn on DHCP renewal; UDN does not.
5. **Never** send `AccessToken` to the front-end. It stays server-side.
6. **Log the JSON-RPC `id`** on both request and response for correlation; strip `AccessToken` from logs.
7. **Do not batch JSON-RPC** — spec explicitly says batch is not guaranteed.

## Quick reference: minimal request/response

```
POST / HTTP/1.1
Host: 192.168.0.5:1516
Content-Type: application/json
Accept: application/json
Content-Length: …

{"jsonrpc":"2.0","method":"powerControl","params":{"AccessToken":"…"},"id":1}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{"jsonrpc":"2.0","result":102,"id":1}
```
