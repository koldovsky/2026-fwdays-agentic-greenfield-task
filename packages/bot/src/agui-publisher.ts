// @kamerton/bot — the AG-UI publisher seam (dashboard tasks.md §4.1,
// design.md Decision 1 of the `dashboard` change): the injected port
// `pipeline.ts` calls at each run/text/state boundary of one
// `handleUpdate()` turn, mirroring the `ModelPort`/`CalendarPort` seam
// pattern already used in this codebase.
//
// STAGE-C STEP 0 RELOCATION: the `AguiEvent` union, `AguiPublisher`
// interface, and `noopAguiPublisher` are pure types plus a trivial no-op —
// they now live in `@kamerton/lib/src/agui/events.ts` (framework-free
// shared core, TC-PURE-01) so the dashboard app can depend on them WITHOUT
// depending on `@kamerton/bot` (the whole point of also moving
// `compileFirstLessonBrief` to lib). This module re-exports them so every
// existing importer within `packages/bot` (`pipeline.ts`,
// `http-agui-publisher.ts`, `testing/fake-agui-publisher.ts`, and this
// package's own tests) keeps working unchanged.

export type { AguiEvent, AguiPublisher } from "@kamerton/lib/src/agui/events.ts";
export { noopAguiPublisher } from "@kamerton/lib/src/agui/events.ts";
