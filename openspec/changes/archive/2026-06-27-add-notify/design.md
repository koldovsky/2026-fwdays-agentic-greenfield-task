## Context

Notifications are the product's only "loud" moment, and the one place browser permissions
and the Notification API enter the codebase. Everything stays client-side and in-app —
no service-worker push (FR-PWA-03). The due-break detection compares "now" (a ticking
client clock) against the engine's next-reminder time; the engine itself stays clock-free.

## Goals / Non-Goals

**Goals:**
- A small client controller that watches for the due time, fires the Notification + card,
  and exposes the two actions.
- Permission requested strictly on the explicit "enable reminders" action.
- Clean denied/unsupported fallbacks; optional sound gated by settings.

**Non-Goals:**
- No background/push notifications or scheduling while closed (out of scope).
- No persistence of events here — that is the `stats` capability; this only emits the action signal.

## Decisions

- **Due detection by comparison, not by `setTimeout` to the exact ms.** A coarse interval tick
  compares now vs. target and fires once when crossed. Rationale: robust to tab throttling and
  sleep; avoids drift. Alternative (single long timer) rejected — unreliable across suspends.
- **Permission request is event-handler-bound** to the enable action (FR-NOTIFY-03/BC-NOTIFY-01).
  Feature-detect `"Notification" in window`; treat unsupported like denied (card-only).
- **Card is the source of truth; the Notification mirrors it.** If the Notification can't show,
  the card still does (FR-NOTIFY-04). Both actions route through the same handlers.
- **Sound** is a short preloaded audio clip played only when `soundEnabled` (FR-NOTIFY-05); failure
  to play is swallowed (autoplay policies) — never an error.

## Risks / Trade-offs

- [Background tabs throttle timers] → comparison-on-tick + re-check on `visibilitychange` so a
  returning user sees the due state promptly.
- [Autoplay blocks sound] → best-effort; the visual nudge is the real signal.
- [Double-firing on re-render] → guard with a "last fired target" ref so each due time fires once.
