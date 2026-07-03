// Public API barrel for the subscription entity — other layers import ONLY this.
export type { Subscription, Plan, SubscriptionStatus } from "./model/types";
export {
  isSubscriptionActive,
  isFree,
  hasPaidAccess,
  type SubscriptionAccess,
} from "./lib/subscription";
