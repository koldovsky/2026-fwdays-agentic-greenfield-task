// @kamerton/db — the only SQLite touchpoint (TC-DATA-01, NFR-PRIV-01).
// Tables arrive with their slices: leads, requests (intake profile lives
// here, FR-INTAKE-08), bookings (status: pending/confirmed/declined/cancelled),
// questions (FR-KB-01). The *.db file is gitignored.

import Database from "better-sqlite3";
import { initSchema } from "./schema.ts";

export {
  initSchema,
  BOOKING_STATUSES,
  type BookingStatus,
  REQUEST_STATES,
  type RequestState,
  REQUEST_FORMATS,
  type RequestFormat,
  REQUEST_GOAL_TAGS,
  type RequestGoalTag,
} from "./schema.ts";
export {
  insertBooking,
  updateBookingStatus,
  findBookingsByRequestId,
  type InsertBookingInput,
  type BookingRow,
} from "./bookings.ts";
export {
  insertLead,
  findLeadByTelegramUserId,
  deleteLeadCascade,
  type InsertLeadInput,
  type LeadRow,
  type DeleteLeadCascadeResult,
} from "./leads.ts";
export {
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  parseOfferedSlots,
  type InsertRequestInput,
  type UpdateRequestFieldsInput,
  type RequestRow,
  type OfferedSlot,
} from "./requests.ts";
export {
  insertNotification,
  findDeliverableNotifications,
  markNotificationDelivered,
  markNotificationFailed,
  NOTIFICATION_KINDS,
  type NotificationKind,
  NOTIFICATION_DELIVERY_STATUSES,
  type NotificationDeliveryStatus,
  type InsertNotificationInput,
  type NotificationRow,
} from "./notifications.ts";
export {
  insertMessage,
  findRecentMessagesForRequest,
  findMessagesForRequest,
  MESSAGE_ROLES,
  type MessageRole,
  type InsertMessageInput,
  type MessageRow,
} from "./messages.ts";
export {
  insertQuestion,
  findOpenInboxQuestions,
  findQuestionById,
  markQuestionAnswered,
  retryQuestionDelivery,
  markQuestionDeliveryStatus,
  findDeliverableQuestions,
  QUESTION_ANSWER_SOURCES,
  type QuestionAnswerSource,
  QUESTION_STATUSES,
  type QuestionStatus,
  QUESTION_DELIVERY_STATUSES,
  type QuestionDeliveryStatus,
  type InsertQuestionInput,
  type QuestionRow,
} from "./questions.ts";

/**
 * Open (or create) the SQLite database file at `path` and ensure every table
 * this module owns exists. Pass `:memory:` for tests. Synchronous, no ORM —
 * plain better-sqlite3 (TC-DATA-01).
 */
export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  // SQLite defaults `foreign_keys` OFF per connection (better-sqlite3 does
  // not change that default) — without this, `ON DELETE CASCADE`/`SET NULL`
  // on leads/requests/bookings would silently never fire (design.md
  // Decision 4 Risks, NFR-PRIV-02). `openDatabase()` is the only touchpoint
  // that opens a connection (TC-DATA-01), so setting it once here covers
  // every caller.
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}
