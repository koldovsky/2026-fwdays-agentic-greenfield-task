// Public API for the shared data layer (shared/lib/db). Driver-agnostic: the
// concrete Queryable adapter (node-postgres, kysely, …) is chosen at the app edge.
export type { Queryable, QueryResult } from "./port";
export {
  createCvProfileRepo,
  type CvProfileRepo,
  type CvProfileRecord,
  type SaveCvProfileInput,
} from "./cv-profile-repo";
export {
  createTailoringRepo,
  type TailoringRepo,
  type TailoringRecord,
  type TailoringSummary,
  type SaveTailoringInput,
  type ChecklistItemInput,
  type BulletInput,
  type Importance,
  type Grounding,
} from "./tailoring-repo";
export {
  createUserRepo,
  type UserRepo,
  type PersistedUser,
  type CreateUserInput,
  type AuthProvider,
} from "./user-repo";
export {
  createCredentialsRepo,
  type CredentialsRepo,
  type EmailCredential,
} from "./credentials-repo";
export {
  createUsageCounterRepo,
  type UsageCounterRepo,
  type UsageCounterRecord,
} from "./usage-counter-repo";
export {
  createSubscriptionRepo,
  type SubscriptionRepo,
  type SubscriptionRecord,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UpsertSubscriptionInput,
} from "./subscription-repo";
