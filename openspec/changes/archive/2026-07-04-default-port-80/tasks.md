## 1. Back-end code

- [x] 1.1 In `back-end/src/index.ts`, replace `Number(process.env.PORT ?? 3000)` with `Number(process.env.PORT ?? 80)`.
- [x] 1.2 In `back-end/src/app.ts`, replace `options.port ?? Number(process.env.PORT ?? 3000)` with `options.port ?? Number(process.env.PORT ?? 80)`, and update the JSDoc line above `port?: number` to read `Defaults to \`PORT\` / 80.`.
- [x] 1.3 Run `npm run back:build` — the TypeScript compile must pass from repo root.
- [x] 1.4 Run `npm run back:test` — all existing suites (including `app.test.ts` and `websocket.test.ts`, which bind `port: 0`) must stay green. (11/11 passing.)

## 2. Sync main spec

- [x] 2.1 Apply the delta from `openspec/changes/default-port-80/specs/platform-foundation/spec.md` to `openspec/specs/platform-foundation/spec.md` (either via `/opsx:sync` or by hand): extend the "Single-origin Fastify server" paragraph to pin the default at `80` and cite `FR-HOSTING-02`, then append the two new scenarios (`Default port is 80`, `PORT env var overrides the default`).
- [x] 2.2 Verify `openspec validate default-port-80` passes.

## 3. Docs

- [x] 3.1 Edit `back-end/README.md`: in the environment-variables table, flip the `PORT` default from `3000` to `80`.
- [x] 3.2 Edit `back-end/README.md`: rename the "Running on port 80 (Orange Pi)" section to "Running on the default port 80 (Linux)" and reframe the intro sentence so the `setcap` command is what unlocks the *default*, not an opt-in. Keep the alternative `PORT=8080` + iptables paragraph.
- [x] 3.3 Edit `back-end/README.md`: under the environment-variables section (or as a new "Development on macOS / non-privileged shells" subsection), document `PORT=3000` (or any high port) as the standard opt-out for local dev where `cap_net_bind_service` is not available.
- [x] 3.4 Grep the repo for any lingering docs that still say the default is `3000` outside the archive. Findings: (a) `back-end/.env.example` still ships `PORT=3000` — reframed with a header comment so it reads as the dev opt-out, not the app default. (b) `front-end/vite.config.ts` proxies to `VITE_BACK_PORT ?? 3000` — intentional per design.md decision #1; the Vite proxy targets whichever port the developer chose to run the back-end on, and `3000` is the documented dev opt-out. (c) `docs/capabilities.md:32` uses `curl http://localhost:PORT/` as a placeholder — not a literal, left as-is. No other refs outside `openspec/changes/archive/**`.

## 4. Verification

- [x] 4.1 On a machine where the Node binary has `cap_net_bind_service` (or as root), run `npm start` (after `npm run back:build`) with `PORT` unset and confirm the startup log line reads `mytv back-end listening on http://0.0.0.0:80`, and `curl http://localhost/api/health` returns `200 { "status": "ok" }`. Verified: on the implementer's macOS box the Node binary was already permitted to bind low ports, so `npm --prefix back-end start` (with `PORT` unset) logged `mytv back-end listening on http://0.0.0.0:80` and `curl http://localhost/api/health` returned `200 {"status":"ok",...}`.
- [x] 4.2 On the dev laptop, run `PORT=3000 npm run back:dev` and confirm the startup log line reads `:3000` and `curl http://localhost:3000/api/health` returns `200`. This exercises the opt-out path. Verified with `PORT=3000 npm --prefix back-end start`: `mytv back-end listening on http://0.0.0.0:3000` + `curl -> 200`.
- [x] 4.3 Confirm the mDNS SRV record's advertised port matches whichever port the process actually bound (either `80` or the `PORT` override) — the `back-end/src/app.ts` change means both call sites read the same resolved value; a `dns-sd -G v4 mytv.local` + resolve step or an inspection of `/api/health` `mdns.state` output is sufficient. Verified: the "mDNS advertisement started" log line reports `port:80` under the default run and `port:3000` under the opt-out run, matching the actual bind.

## 5. Session log

- [x] 5.1 Prepend a new entry to `docs/current-state.md` (heading = `## <ISO-8601 UTC timestamp>`) summarizing: default HTTP port is now `80` (`FR-HOSTING-02` alignment); files touched (`back-end/src/index.ts`, `back-end/src/app.ts`, `back-end/README.md`, `openspec/specs/platform-foundation/spec.md`); note for the next session that local dev on macOS should set `PORT=3000` unless the Node binary has `cap_net_bind_service`.