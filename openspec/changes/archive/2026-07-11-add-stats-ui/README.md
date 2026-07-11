# add-stats-ui

Stats analytics UI (slice 005): the Stats page that **renders** the read-only architecture §4.1
snapshot from slice 004 — summary tiles (today / week / month / all-time / streak), per-metric score
cards (value + zone color + baseline delta, with the <7-day "building" state), and the bar-by-day /
donut-by-category / per-category line charts — and composes the slice 003 session-log component onto
the page. Frontend only: no metric computation, no coach, no live-poll transport, no backend, no
migration.
