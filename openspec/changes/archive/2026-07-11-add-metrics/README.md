# add-metrics

Metrics engine (slice 004): the deterministic, framework-free computation of M1-M6 over a user's
saved sessions and pause segments, the activity-heatmap day buckets, and the architecture §4.1
snapshot — exposed read-only as `GET /api/stats/snapshot` and `GET /api/stats/heatmap`. Backend and
tests only; no UI, no coach, no migration (metrics read slice 003's tables).
