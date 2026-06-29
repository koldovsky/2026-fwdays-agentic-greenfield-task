## Why

From the popup, getting to add a note took two hops (Open book → Add note) and wasn't
obvious. Surface the primary intent — adding a note — directly in the popup.

## What Changes

- The popup gains a primary **Add note** action linking to `/book/<slug>/notes/new`.
- The popup title becomes a link to `/book/<slug>` (extra affordance); **Open book**
  stays as a secondary action.

## Capabilities

### Modified Capabilities
- `shelf-index`: the summary popup now offers an "Add note" action and a clickable title.

## Impact

- Modified: `components/BookPopup.tsx`. No data/routing changes (routes already exist).
