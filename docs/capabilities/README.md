# Capabilities

One file per OpenSpec capability sliced from [docs/requirements.md](../requirements.md).
File number = build order (see [docs/implementation-plan.md](../implementation-plan.md) for
the dependency graph and phased rationale). Each file becomes an
`openspec/specs/<capability>/` spec via an `openspec/changes/add-<capability>/` proposal.

`requirements.md` is the source of truth; these are scoped descriptions, not the spec text.

| Order | Capability | Phase | OpenSpec change | Status |
|-------|------------|-------|-----------------|--------|
| 00 | [foundation](00-foundation.md) | 0 | `add-foundation` | in progress |
| 01 | [auth](01-auth.md) | 1 | `add-auth` | not started |
| 02 | [app-shell](02-app-shell.md) | 1 | `add-app-shell` | not started |
| 03 | [theming](03-theming.md) | 1 | `add-theming` | not started |
| 04 | [time-entries](04-time-entries.md) | 2 | `add-time-entries-core` | not started |
| 05 | [tags](05-tags.md) | 3 | `add-tags` | not started |
| 06 | [profile-stats](06-profile-stats.md) | 4 | `add-profile-stats` | not started |
| 07 | [daily-insight](07-daily-insight.md) | 5 | `add-daily-insight` | not started |
| 08 | [home-widget](08-home-widget.md) | 6 | `add-home-widget` | not started |
| 09 | [live-activity](09-live-activity.md) | 6 | `add-live-activity` | not started |
| 10 | [streaks](10-streaks.md) *(optional)* | 7 | `add-streaks` | not started |
