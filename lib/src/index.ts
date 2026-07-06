// @kamerton/lib — framework-free pure core (TC-PURE-01).
// Modules arrive slice-by-slice, test-first (red -> green):
//   slots/     — grid, free-slot subtraction, rankSlots()   (FR-SLOT-*, FR-GUARD-03)
//   intake/    — age validation AGE_BELOW_MIN                (FR-INTAKE-02, FR-GUARD-04)
//   booking/   — state machine                               (FR-HITL-03)
//   dashboard/ — HallMap status, week grid, JSON-Patch apply  (FR-DASH-03, TC-PROTO-01)
// No next/*, no React/DOM, no Telegram SDK, no Google SDK here — ever.

export * from "./intake/age";
export * from "./intake/format";
export * from "./intake/audience";
export * from "./intake/copy";
export * from "./intake/state-machine";
export * from "./intake/first-lesson-brief";
export * from "./dashboard/hall-status";
export * from "./dashboard/week-grid";
export * from "./dashboard/json-patch";
export * from "./agui/events";
