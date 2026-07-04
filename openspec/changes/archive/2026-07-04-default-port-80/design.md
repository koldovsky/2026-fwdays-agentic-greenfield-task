## Context

The `platform-foundation` (C1) change landed with `PORT=3000` as the fallback so `npm run back:dev` would work out of the box on a developer laptop without `sudo` or `setcap`. Every production artifact (product-brief, `AGENTS.md`, `docs/current-state.md`, the mDNS SRV record, the "open `http://mytv.local/`" UX promise in `FR-HOSTING-02`) implicitly assumes port `80`. The result: two conflicting defaults, both documented, and one has to be overridden on every deploy.

Current state:

- `back-end/src/index.ts` — `const port = Number(process.env.PORT ?? 3000);`
- `back-end/src/app.ts` — `options.port ?? Number(process.env.PORT ?? 3000);` (advertised in the mDNS SRV record)
- `back-end/README.md` — table row `PORT | 3000 | TCP port to listen on.` + a "Running on port 80" section that assumes the user is opting in
- Archived `platform-foundation` design.md — explicitly documents `PORT=3000` dev / `PORT=80` prod as an "alternative rejected" (rejected the two-process split, not the dev default)
- Tests (`back-end/src/app.test.ts`, `back-end/src/websocket.test.ts`) — always pass `port: 0` explicitly, so they are insensitive to the default

The `platform-foundation` archive is immutable — we don't retro-edit it. We modify only the live spec and code.

## Goals / Non-Goals

**Goals:**

- Back-end binds `:80` when the operator does nothing, matching the reachable URL in the product brief and every doc that already prints `http://mytv.local/`.
- Developer workflow still works: `PORT=3000` (or any high port) opts back into a non-privileged bind, and the Vite proxy already reads `VITE_BACK_PORT` so it needs no code change.
- Docs speak with one voice: the README, the platform-foundation spec, and the mDNS README section all agree on the default.

**Non-Goals:**

- TLS or HTTPS on `:443` (BC-01/BC-03/BC-05 — local-only traffic; the SPA is `http://` intentionally).
- Reverse proxy or systemd socket-activation. Single process, single port stays.
- Any change to `HOST` (`0.0.0.0`), `SERVE_SPA`, `MDNS_ENABLED`, or the health/error envelope shape.
- Automatic `setcap` at install time. The README describes the command; deploying it is out of scope for this change.

## Decisions

### 1. Default is `80`, not `8080` or `3000`

Alternatives considered:

- **`8080` + iptables/nftables redirect.** Rejected: adds a second config surface (the firewall table), still needs elevated privileges to install the rule, and now the log line reads `:8080` while the URL reads `:80` — the same drift we're trying to remove, just moved into netfilter.
- **Keep `3000`, put a reverse proxy in front.** Rejected: two processes to supervise, and the archived `platform-foundation` design already rejected this alternative on the same grounds. Nothing has changed to make it more attractive now.
- **`80`, direct bind.** Chosen. Linux allows this via `cap_net_bind_service` (already documented in `back-end/README.md`); macOS dev machines running as the login user need `PORT=3000` (or `sudo`), which mirrors the previous default and is a documented one-liner in `.env`.

### 2. Fallback source of truth is a single constant

Both `back-end/src/index.ts` and `back-end/src/app.ts` currently duplicate the `?? 3000` literal. Rather than sprinkle the new `80` across both files, we replace both call sites with the same literal. A shared `DEFAULT_PORT` constant is tempting but not worth introducing a config module for one literal — three tokens saved, one indirection added. If a third caller shows up we hoist it.

### 3. Tests stay unchanged

`app.test.ts` and `websocket.test.ts` always pass `port: 0` to `app.listen(...)`. That decouples them from the default, which is exactly the property we want during CI (no root, no `setcap`, arbitrary port picked by the kernel). We add one new assertion in `app.test.ts` that verifies the *resolved* mDNS SRV port matches the value returned by `getPort()` — that's already in place indirectly via the health snapshot — and rely on the existing behavior. No new test file.

### 4. README rewrite tone

The "Running on port 80 (Orange Pi)" section flips: today it reads "here's how to opt into the low port"; after this change it reads "here's what the default requires on Linux, and how to opt out on a dev machine that can't grant the capability." Same command (`setcap 'cap_net_bind_service=+ep'`), reframed. The `.env.example` note is unchanged — still no auto-loading.

## Risks / Trade-offs

- **[macOS dev machine can't bind `:80` as a non-root user.]** → Mitigation: README's dev section calls out `PORT=3000` as the standard opt-out; `.env.example` (or the `npm run back:dev` invocation) can set it. Existing test suites already bind `port: 0`, so unit tests don't regress.
- **[Two conflicting defaults during rollout.]** → Mitigation: shipped as one atomic PR; the archived `platform-foundation` docs stay as historical record (they explicitly note the dev/prod split), and the current-state.md session log entry called out for this change makes the new default visible to the next session.
- **[Someone runs `npm start` on Linux without `setcap` and gets `EACCES`.]** → Mitigation: the `setcap` one-liner is right at the top of the README's "Running on a low port" section, and the Fastify startup error is already logged via the existing `catch` in `index.ts` (`failed to start server` + `err: error`), so the failure mode is clear rather than silent.
- **[mDNS SRV record advertises `:80` even in a dev shell where the process fell back to `PORT=3000`.]** → Not a risk: `back-end/src/app.ts` reads the same resolved port for both `listen` and the SRV record; changing the default in one place changes it in both.

## Migration Plan

1. Edit `back-end/src/index.ts` and `back-end/src/app.ts` — change `?? 3000` to `?? 80` in both call sites; update the JSDoc line above `port?: number` to say "defaults to `PORT` / `80`".
2. Edit `back-end/README.md`:
   - `PORT` row default flips from `3000` to `80`.
   - Rename "Running on port 80 (Orange Pi)" → "Running on the default port 80 (Linux)"; add a two-line "Development on macOS / non-privileged shells" subsection pointing at `PORT=3000`.
3. Sync `openspec/specs/platform-foundation/spec.md` from the delta (add the two new scenarios; extend the requirement paragraph).
4. Prepend a `docs/current-state.md` entry describing the flip.
5. Run `npm run back:build`, `npm run back:test`, `npm run front:build`. Manual check on the dev machine: `PORT=3000 npm run back:dev` still boots (opt-out); on the Pi (or a Linux VM with `cap_net_bind_service`), plain `npm start` binds `:80`.

Rollback: revert the two `?? 80` literals; revert the README section. No data or protocol changes to unwind.

## Open Questions

- None. `HOST=0.0.0.0` and the `SERVE_SPA=0` opt-out are unchanged, and no consumer (front-end, tests, mDNS module) reads the literal — everything flows through the resolved value.