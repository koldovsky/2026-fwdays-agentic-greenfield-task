# MVP Capabilities — Bye Binge (Project "Pause")

Derived from `docs/product-brief.md` and `docs/requirements.md`.

## Overview

The MVP splits into 5 capabilities. `tone-engine` is cross-cutting — every other capability depends on it for copy.

```
┌─────────────────────────────────────────────────────────────────┐
│                        BYE BINGE MVP                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      tone-engine                         │   │
│  │              (cross-cutting — used by all)               │   │
│  │        FR-TONE-01–04 · BC-BRAND-01 · TC-TEXT-01          │   │
│  │                     Zustand state                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 emergency-intercept                      │   │
│  │                                                          │   │
│  │  [STOP button] → [modal] → [STEPP wizard 3 phases]       │   │
│  │                         → [grounding summary]           │   │
│  │  FR-STOP-01–04 · FR-REFL-01–05 · NFR-PERF-01            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────────┐  ┌──────────────────────────────┐   │
│  │   progress-logging    │  │         dashboard            │   │
│  │                       │  │                              │   │
│  │  Daily check-in       │  │  Metrics panel               │   │
│  │  Success story entry  │  │  Top 3 tasks                 │   │
│  │  Streak + lifetime    │  │  Rotating stories            │   │
│  │  counters             │  │                              │   │
│  │  FR-LOG-01–03         │  │  FR-DASH-01/03/04            │   │
│  │  FR-DASH-02           │  │                              │   │
│  └───────────────────────┘  └──────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    offline-pwa                           │   │
│  │  Service worker · PWA install · background sync          │   │
│  │  NFR-OFFLINE-01 · TC-STACK-01 (PWA)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Capability Reference

| Capability | Core scope | Requirements |
|---|---|---|
| `tone-engine` | Language toggle, 3 hardcoded persona variants, Zustand `activeToneMode`, exclamation rules | FR-TONE-01–04, BC-BRAND-01, TC-TEXT-01 |
| `emergency-intercept` | Fixed STOP button, full-screen modal, STEPP 3-phase wizard, grounding summary, safe exit, draft persistence | FR-STOP-01–04, FR-REFL-01–05, NFR-PERF-01 |
| `progress-logging` | Daily binge-free check-in, success story entries, streak + lifetime counter logic | FR-LOG-01–03, FR-DASH-02 |
| `dashboard` | Authenticated landing screen, metrics display, Top 3 tasks panel, rotating stories with universal fallbacks | FR-DASH-01/03/04 |
| `offline-pwa` | Service worker, PWA install manifest, background sync, offline-first draft caching | NFR-OFFLINE-01, TC-STACK-01 (PWA) |

## Notes

- **`tone-engine` sequencing:** All other capabilities depend on `tone-engine` for copy. Build it first, or other caps need placeholder text until it ships.
- **Metrics data ownership:** `FR-DASH-02` (streak/lifetime counters) lives in `progress-logging` as data logic but renders on the dashboard. `dashboard` consumes the data; `progress-logging` owns it.
- **`offline-pwa` is a first-class capability:** Offline resilience is a core operating principle per the product brief. It is not an afterthought — it carries real scope (service worker, background sync, offline draft caching).
