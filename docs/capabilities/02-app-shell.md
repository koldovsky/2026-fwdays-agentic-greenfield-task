# Capability: app-shell

- **Order:** 02 · **Phase:** 1 · **OpenSpec change:** `add-app-shell` · **Status:** not started
- **Depends on:** auth · **Blocks:** time-entries (and all screens)
- **Packages:** `apps/mobile`

## Summary

The navigation skeleton and gating: a bottom-tab shell that only authenticated users reach,
plus the first-run empty state.

## Requirements

| ID | Description |
|----|-------------|
| FR-SHELL-01 | Bottom-tab navigation: **Timer/History**, **Stats**, **Profile** |
| FR-SHELL-02 | Unauthenticated users see only the auth screen; the rest of the app is gated |
| FR-SHELL-03 | First-run empty state (no entries): hero copy + prominent "Start your first entry" |

## Scope

- Native bottom-tab navigator (per react-native skill: native tabs/stack).
- Auth gate wrapping the tab tree; unauthenticated → auth screen only.
- Empty-state screen shown when the user has no entries yet.

## Non-goals

No screen content beyond placeholders + the empty state — Timer/Stats/Profile bodies land with
`time-entries` and `profile-stats`.

## Risks / notes

Pairs with `theming`: build the shell against design tokens from the start (FR-THEME-03).
