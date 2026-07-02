## 1. Shared — contracts + pure filter (test-first)

- [ ] 1.1 Add `Tag` contract to `contracts.ts` (`id`, `userId`, `name`, `color: string | null`); add `tags: Tag[]` to `TimeEntry`; add optional `tagIds?: string[]` to `CreateTimeEntry`, `ManualTimeEntry`, `UpdateTimeEntry`
- [ ] 1.2 Add `packages/shared/src/tags.ts` with pure `filterEntriesByTags(entries, selectedTagIds)` → entries whose tags intersect the selection; empty selection returns all (FR-TAG-04, TC-PURE-01)
- [ ] 1.3 Write `tags.test.ts`: empty selection returns all, single/multi tag intersection, entry with no tags excluded when filtering, entry matching any selected tag included
- [ ] 1.4 Export `tags` from `index.ts`; `npm run build -w @honeydo/shared`; shared tests green

## 2. API — model + tags module

- [ ] 2.1 `schema.prisma`: add `Tag` (id, userId + `user` relation onDelete Cascade, name, color String?, `@@unique([userId, name])`, `@@index([userId])`) and implicit m-to-n `tags Tag[]` on `TimeEntry` / `entries TimeEntry[]` on `Tag`; `npm run migrate`
- [ ] 2.2 Create `apps/api/src/tags/` module (module/controller/service) behind `JwtAuthGuard`, `@CurrentUser`-scoped
- [ ] 2.3 Tag DTOs (class-validator): `CreateTagDto` (name required non-empty, color optional string), `UpdateTagDto` (name/color optional)
- [ ] 2.4 Tags service: `list`, `create` (reject case-insensitive duplicate → 409/400), `update` (rename/color, duplicate guard), `remove` (delete detaches only — implicit m-to-n leaves entries intact); all user-scoped, 404 on cross-user
- [ ] 2.5 Tags controller routes: `GET /tags`, `POST /tags`, `PATCH /tags/:id`, `DELETE /tags/:id`; wire module into `AppModule`
- [ ] 2.6 Tags service/e2e test: create + duplicate rejected, rename, **delete detaches without deleting entries**, cross-user isolation (FR-TAG-03)

## 3. API — entries carry + accept tags

- [ ] 3.1 Entry DTOs accept `tagIds?: string[]`; entry service `toContract` maps `tags`; every read/write uses `include: { tags: true }`
- [ ] 3.2 On create/manual/update, `set` the entry's tags to the user's tags matching `tagIds` (filter out ids not owned by the user); omitting `tagIds` leaves tags unchanged, `[]` clears (FR-TAG-02)
- [ ] 3.3 `continue` copies the source entry's tags onto the new running entry (FR-ENTRY-08); add/extend a test asserting continue copies tags
- [ ] 3.4 `npm run lint && typecheck && test -w @honeydo/api` green

## 4. Mobile — tags data + entry assignment

- [ ] 4.1 `src/api/tags.ts` client (list/create/update/remove) + `src/hooks/useTags.ts` (query `['tags']` + create/rename/delete mutations invalidating tags and entries)
- [ ] 4.2 Extend the entries API client + `useTimeEntries` mutations to send `tagIds` (create/manual/update/continue already copies server-side)
- [ ] 4.3 `TagPicker` component: shows the user's tags as selectable chips (colored dot + name), multi-select, and an inline "create tag" (name + color from a small preset palette); token-driven
- [ ] 4.4 Wire `TagPicker` into `EntryFormModal` (add/edit): seed from the entry's tags, submit selected `tagIds`
- [ ] 4.5 Render colored tag dots + names on `TimerEntry` rows (per the design reference)

## 5. Mobile — History filter

- [ ] 5.1 `FilterChips` row on `HistoryScreen`: "All" + one chip per tag (colored dot), single or multi select; token-driven per the design `FilterChip`
- [ ] 5.2 Apply `filterEntriesByTags` to the entries before grouping; empty selection shows all (FR-TAG-04)
- [ ] 5.3 Empty-filter-result state is calm (e.g. "No entries with these tags")

## 6. Verify & document

- [ ] 6.1 `npm run gate` green + mobile lint/typecheck; no raw-hex/token violations in new UI
- [ ] 6.2 Manual device smoke: create tag → assign on new + manual entry → see dots → filter History → rename tag → delete tag (entries survive) → continue copies tags
- [ ] 6.3 Update `docs/current-state.md` (newest-first) with what shipped + FR IDs; mark statuses
