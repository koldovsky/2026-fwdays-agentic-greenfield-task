# Product Brief — Pause / Break Reminder

> Companion to `requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the narrative behind it. The tone of
> the whole product is calm and pressure-free, with no gamified streaks and no
> guilt (BC-CALM-01).

## What this is

Pause is a small, privacy-first, installable PWA that reminds a person to take
breaks during long focused work, and reflects back — calmly — whether they're
actually taking them. The user sets their working hours, days, and a break
interval. While the app is open, it raises a gentle notification at the right
moment with two actions, "Took a break" and "Snooze", and quietly records each
one. A simple chart shows breaks done versus snoozed over time. There are no
accounts, no backend, and no trackers: settings live in `localStorage` and
statistics in the browser's IndexedDB.

## Who it is for

The single actor is **one person at their own desk** — typically a developer or
knowledge worker doing long focused sessions on a laptop with a phone nearby.
There are no roles, no sign-in, and no server-side profile. Anyone who installs
the app is a full user; the repo and a short demo are the homework's primary,
demonstrable artifacts (BC-DEMO-01).

## The pain it addresses

People lose track of time and sit for hours without moving. Existing tools fall
into two traps: nagging productivity trackers that turn rest into yet another
metric to defend, or OS timers that are easy to dismiss and tell you nothing
about whether you actually stepped away. Pause reduces this to one calm screen
that gives permission to stop and shows an honest, low-stakes picture of your
rest habits.

## End-to-end usage

1. **Land.** The main view shows a breathing ring with the time until the next
   break at its center. On first run, calm defaults are applied and a short intro
   line appears (FR-SHELL-03).
2. **Configure.** In Settings the user sets working hours, working days, the
   reminder interval, and the snooze length (FR-SETTINGS-01). Changes persist
   across reloads (FR-SETTINGS-02) and immediately recompute the next reminder
   (FR-SETTINGS-04).
3. **Work.** The ring counts down and breathes while the engine computes the next
   reminder time from the working-window rules (FR-REMIND-01/03).
4. **Get reminded.** When the time is reached, a notification fires together with
   an in-app card carrying two actions (FR-NOTIFY-01/02). Notification permission
   is requested only when the user enables reminders, never silently on load
   (FR-NOTIFY-03, BC-NOTIFY-01).
5. **Act.** "Took a break" or "Snooze" records a `BreakEvent` (FR-STATS-01); a
   snooze reschedules by the snooze rule (FR-REMIND-04). If permission was denied,
   the in-app card still works — nothing errors (FR-NOTIFY-04).
6. **Review.** The Stats view shows breaks done versus snoozed per day as a calm
   chart (FR-STATS-03) that updates live as new events land (FR-STATS-04).
7. **Install.** The app installs to the phone's home screen (FR-PWA-01) and works
   offline after first load (FR-PWA-02).

## Key workflows in prose

- **The core loop.** Configure once, then simply work; the app nudges you at the
  right moments and you tap one of two buttons. The entire MVP exists to support
  this loop calmly.
- **Snooze without guilt.** Not ready? Snooze pushes the next reminder by a fixed
  few minutes, clamped to working hours, and records the choice honestly — no
  penalty, no broken streak.
- **Review your habits.** Open Stats to see done-versus-snoozed per day. It is a
  mirror, not a scoreboard.
- **Use it as an app.** Add to home screen and it behaves like a native app:
  standalone window, offline shell, its own icon.

## MVP vs Future boundary

**In the MVP:** the app shell and responsive layout, settings with persistence,
the pure reminder engine (working-window trigger rules + snooze), in-app
notifications with two actions, local statistics with a live-updating chart, and
PWA install + offline shell — all local, all private, all calm.

**Future (deferred), none of it built in the MVP:**

- background push / scheduled reminders while the app is closed;
- user accounts, history, or favorites persisted server-side; cross-device sync;
- native app-store builds (Capacitor / Xcode);
- multiple UI languages beyond the chosen one;
- calendar integration or team / shared features.

## Operating principles

- **Calm, not gamified.** No streaks, no pressure, no guilt; the one warm moment
  in the whole product is the instant a break is due (BC-CALM-01).
- **Privacy-first and local.** No accounts, no backend, no analytics, no trackers;
  settings in `localStorage`, statistics in IndexedDB (BC-PRIVACY-01).
- **Honest under failure.** Denied notification permission degrades to the in-app
  card; an empty stats screen is an invitation, never a blank or an error
  (FR-NOTIFY-04, FR-STATS-05).
- **Accessible and quiet.** Reduced motion is respected and the app stays fully
  usable with zero animation (NFR-MOTION-01).
