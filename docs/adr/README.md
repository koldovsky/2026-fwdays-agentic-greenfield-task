# Architecture Decision Records (ADR)

Each ADR captures one significant decision: its context, the choice, and the consequences.
Records are immutable — to reverse one, add a new ADR that supersedes it (don't edit history).

Format: lightweight [Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Source of rationale: [../requirements.md](../requirements.md) and [../prd.md](../prd.md).

| # | Decision | Status |
|---|---|---|
| [0001](./0001-plain-typescript-no-nestjs.md) | Plain TypeScript, no NestJS | Accepted |
| [0002](./0002-grammy-telegram-client.md) | grammY as the Telegram client | Accepted |
| [0003](./0003-raw-anthropic-api-no-agent-framework.md) | Raw Anthropic API, no agent framework | Accepted |
| [0004](./0004-self-hosted-postgres-coolify.md) | Self-hosted PostgreSQL on Coolify/Hetzner | Accepted |
| [0005](./0005-prisma-orm.md) | Prisma as the ORM | Accepted |
| [0006](./0006-build-off-box-ghcr.md) | Build off-box: GitHub Actions → GHCR | Accepted |
| [0007](./0007-postgres-source-of-truth-notion-mirror.md) | Postgres source of truth, Notion async mirror | Accepted |
| [0008](./0008-no-image-persistence.md) | No image persistence (privacy) | Accepted |
| [0009](./0009-eslint-prettier-lint-format.md) | ESLint + Prettier lint/format tooling | Accepted |
| [0010](./0010-vitest-test-runner.md) | Vitest as the test runner | Accepted |
| [0011](./0011-fallow-static-analysis.md) | Fallow for static analysis (dead code, duplication, complexity) | Accepted (impl deferred to M0) |
| [0012](./0012-implementation-loop-runner.md) | Implementation loop runner (backlog-driven orchestrator skill) | Accepted (runner hand-built next) |
| [0013](./0013-eval-framework.md) | Eval framework (deterministic-first, local-run + CI ratchet) | Accepted (suites built per-capability) |

**Status values:** Proposed · Accepted · Deprecated · Superseded by ADR-XXXX.
