## Why

US-10 (M7): the owner's food, metrics, and reviews should also appear in **their own** Notion
workspace — without ever slowing the bot. Postgres is the source of truth; Notion is a **best-effort,
async** mirror (requirements §9). This is the last feature before `hardening`, and the schema is
shaped now so future per-user OAuth slots in without touching any write path.

## What Changes

- **Two new tables** (one migration): `notion_sync` (the durable outbox — one row per Postgres write
  to mirror) and `notion_config` (per-user mirror config: `auth_type env|oauth`, credential *reference*
  (never the secret), the four Notion DB IDs, `enabled`). v1 implements only the `env` branch.
- **Post-write enqueue**: each successful mirrored Postgres write appends a `pending` `notion_sync`
  row via a shared injected outbox. Enqueue is best-effort — its failure is logged and **never breaks
  the user reply** (the data is already safe in Postgres).
- **Mirror four tables**: `food_log` (create + correction-update), `food_database`, `body_metrics`,
  `reviews`. `progress_notes` is **not** mirrored (no corresponding Notion DB).
- **In-process background worker** (`src/notion/`): polls the outbox, resolves the user's Notion
  client + DB IDs via a `NotionCredentialResolver`, writes/updates the page (idempotent via stored
  `notion_page_id`), honours Notion's ~3 req/s, retries failures with exponential backoff, and marks a
  row `dead` after a max attempt count. It starts only when `NOTION_TOKEN` is set and stops cleanly on
  shutdown. Add `@notionhq/client` to deps.
- New env is already declared (all five `NOTION_*` vars optional) — the bot still boots without them.

## Capabilities

### New Capabilities
- `notion-mirror`: the async best-effort mirror — outbox enqueue on every mirrored write, a
  rate-limited retrying worker, per-user `env`-auth config, and the invariant that Notion **never**
  blocks the reply and a mirror failure **never** loses data (Postgres is truth).

### Modified Capabilities
<!-- None. food-logging / body-metrics / review-generation keep identical observable reply behavior;
     the enqueue is an additive, non-blocking side effect, not a requirement change to those flows. -->

## Impact

- **Code:** new `src/notion/` (outbox, worker, credential resolver, row→page mappers, types); a shared
  `enqueue` call added after the four mirrored writes (service layer, not `write.ts`); worker wired in
  `src/index.ts` alongside the review scheduler + shutdown hook; new Prisma models + migration;
  `@notionhq/client` dependency.
- **Invariants:** #1 (Postgres is memory — Notion is a downstream mirror, never read back for facts),
  #7 (memory cap — one lightweight in-process poller, no extra process; small `@notionhq/client`
  footprint), #8 (multi-tenancy — every outbox row carries `user_id`; the resolver is per-user),
  #9 (privacy — the Notion token stays in env / `credential_ref`, never stored plaintext; the worker
  never logs raw body/progress values). Notion **never blocks** the reply (US-10 accept criterion).
- **LLM-cost:** none — the mirror makes zero LLM calls.
- **Deploy-time gate:** the real Notion round-trip needs `NOTION_TOKEN` (absent in the sandbox), so
  live mirroring is verified at deploy; in-loop tests cover outbox/worker/mapping logic against a fake
  Notion client.
- **Dependencies:** `@notionhq/client` added (build off-box → GHCR; never `npm install` on the host).
