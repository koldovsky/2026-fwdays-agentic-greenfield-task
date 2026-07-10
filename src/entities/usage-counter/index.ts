// Public API barrel for the usage-counter entity — other layers import ONLY this.
export type { UsageCounter, AccountKind } from "./model/types";
export {
  tailoringLimit,
  remainingTailorings,
  canTailor,
  ANON_TAILORING_LIMIT,
  FREE_TAILORING_LIMIT,
} from "./lib/usage-counter";
