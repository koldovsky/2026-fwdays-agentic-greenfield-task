## 1. Database Schema

- [ ] 1.1 Add `BingeFreeLog` model to `prisma/schema.prisma` (`id`, `userId`, `date: DateTime`, unique constraint on `userId + date`)
- [ ] 1.2 Add `SuccessStory` model to `prisma/schema.prisma` (`id`, `userId`, `content: String`, `createdAt: DateTime`)
- [ ] 1.3 Run `prisma migrate dev` to generate and apply the migration
- [ ] 1.4 Configure Supabase RLS policies so each table is readable/writable only by `auth.uid() = userId`

## 2. Zustand Store Slice

- [x] 2.1 Create `store/progress-logging.ts` with state: `currentStreak`, `lifetimeDays`, `todayCheckedIn`, `lastCheckedInDate`, `stories: SuccessStory[]`
- [x] 2.2 Add actions: `setProgressState`, `optimisticCheckIn`, `addStory`
- [x] 2.3 Wire `zustand/middleware/persist` with `localStorage` and SSR-safe fallback (matching pattern from `store/emergency-intercept.ts`)

## 3. Streak Calculation Logic

- [x] 3.1 Create `lib/progress-logging/streak.ts` with a pure `calculateStreak(logs: Date[]): number` function (count consecutive days backward from today)
- [x] 3.2 Write unit tests for `calculateStreak` covering: first day, consecutive days, single missed day resets to 1, lifetime count

## 4. Tone-Aware Copy

- [x] 4.1 Create `lib/progress-logging/copy.ts` with a `ToneMode`-keyed map for all copy: check-in button label, story prompt, today-already-logged message, streak display strings, confirmation messages — no `!` in `calm` mode
- [x] 4.2 Create `lib/progress-logging/use-progress-copy.ts` hook that reads `activeToneMode` from the tone-engine store and returns the correct copy map

## 5. API Routes

- [ ] 5.1 Create `app/api/progress/check-in/route.ts` — `POST`: insert `BingeFreeLog` for today (reject with 409 on duplicate `userId + date`)
- [ ] 5.2 Create `app/api/progress/check-in/route.ts` — `GET`: return all `BingeFreeLog` rows for the authenticated user, sorted descending by date
- [ ] 5.3 Create `app/api/progress/stories/route.ts` — `POST`: insert a `SuccessStory` (validate non-empty content)
- [ ] 5.4 Create `app/api/progress/stories/route.ts` — `GET`: return all `SuccessStory` rows for the authenticated user

## 6. TanStack Query Hooks

- [ ] 6.1 Create `lib/progress-logging/use-check-in.ts` — `useQuery` to fetch check-in logs + seed Zustand slice via `calculateStreak`; `useMutation` for daily check-in with `onMutate` optimistic update and `networkMode: 'offlineFirst'`
- [ ] 6.2 Create `lib/progress-logging/use-stories.ts` — `useQuery` to fetch stories; `useMutation` for story submission with `onMutate` optimistic update and `networkMode: 'offlineFirst'`
- [ ] 6.3 Ensure query invalidation on mutation success so Zustand slice stays in sync with server state

## 7. UI Components

- [x] 7.1 Create `components/progress-logging/DailyCheckIn.tsx` — checkbox/button showing today's check-in status; disabled when `todayCheckedIn` is true; copy via `useProgressCopy`
- [x] 7.2 Create `components/progress-logging/SuccessStoryForm.tsx` — textarea + submit button; client-side validation for non-empty input; copy via `useProgressCopy`
- [x] 7.3 Create `components/progress-logging/ProgressLoggingPanel.tsx` — composes `DailyCheckIn` and `SuccessStoryForm` as side-by-side decoupled panels
- [x] 7.4 Export streak/lifetime values from the Zustand slice (no additional component needed — `dashboard` will consume these directly)

## 8. Integration & Testing

- [x] 8.1 Add a route or page that renders `ProgressLoggingPanel` (e.g. `/progress` or integrate into the dashboard page)
- [ ] 8.2 Verify check-in: submit once, confirm streak increments; attempt second submission same day, confirm it is blocked
- [ ] 8.3 Verify story entry: submit two stories same day, confirm both appear
- [ ] 8.4 Verify streak reset: simulate a missed day by checking against a date with no prior entry, confirm streak resets to 1
- [ ] 8.5 Verify tone copy: switch `activeToneMode` between `calm`, `rational`, `auntie` and confirm copy changes and exclamation mark rules are respected
- [ ] 8.6 Verify offline queue: disable network, submit check-in + story, confirm optimistic updates; re-enable, confirm sync completes
