## 1. Route Protection

- [x] 1.1 Create `middleware.ts` at the project root that checks the Supabase session cookie and redirects unauthenticated requests on `/` to `/sign-in`
- [x] 1.2 Verify authenticated users are not redirected and unauthenticated users never see dashboard content

## 2. Dashboard Copy

- [x] 2.1 Create `lib/dashboard/copy.ts` with tone-aware strings for: section headings, metrics labels (streak, lifetime), task descriptions (3 per tone mode), story CTA prompt
- [x] 2.2 Create `lib/dashboard/use-dashboard-copy.ts` hook that reads `activeToneMode` from the tone-engine Zustand slice and returns the correct copy object

## 3. MetricsPanel Component

- [x] 3.1 Create `components/dashboard/MetricsPanel.tsx` that reads `currentStreak`, `lifetimeDays`, and `todayCheckedIn` from the `progress-logging` Zustand slice
- [x] 3.2 Render streak and lifetime counters with tone-aware labels from `use-dashboard-copy`
- [x] 3.3 Verify no TanStack Query `useQuery` call is made inside `MetricsPanel`

## 4. TopTasksPanel Component

- [x] 4.1 Create `components/dashboard/TopTasksPanel.tsx` that renders the 3 static alternative tasks from `use-dashboard-copy`
- [x] 4.2 Verify the panel is visible above the fold at 375 × 667 px viewport (no scroll required)

## 5. StoryCarousel Component

- [x] 5.1 Create `lib/dashboard/fallback-stories.ts` with 3 universal recovery stories, each including body text and a CTA to write a personal story
- [x] 5.2 Create `components/dashboard/StoryCarousel.tsx` that:
  - reads user `SuccessStory` entries from the `progress-logging` Zustand slice
  - falls back to `fallback-stories.ts` when the user story list is empty
  - initialises the display index at a random position on mount
  - exposes a "next story" control that advances the index with wraparound
- [x] 5.3 Verify the CTA prompt is visible on universal fallback story cards

## 6. Dashboard Page Assembly

- [x] 6.1 Update `app/page.tsx` to import and render `MetricsPanel`, `TopTasksPanel`, and `StoryCarousel` alongside the existing `ProgressLoggingPanel`
- [x] 6.2 Order panels: MetricsPanel → TopTasksPanel → StoryCarousel → ProgressLoggingPanel
- [x] 6.3 Verify the page renders without errors for both authenticated (with and without user stories) states

## 7. Offline Resilience Verification

- [x] 7.1 Verify dashboard renders with meaningful content (last-persisted metrics, static tasks, fallback stories) when the network is disabled in devtools
- [x] 7.2 Verify no panel throws an error or shows a broken state when offline
