// apps/dashboard — the browser-side AG-UI/SSE client (dashboard tasks.md
// §6.2, design.md Decision 2: "a lean AG-UI/SSE client, not CopilotKit").
// `connectAgui` wraps native `EventSource`; `safeParseAguiEvent` never
// throws on a malformed frame or an unrecognized event type;
// `applyAguiEvent` is the pure client-side reducer the page (§6.9) folds
// every incoming event through.
//
// TYPED THROWING STUB — red state for tasks.md §6.2's red half. The
// exported shapes below are the contract `agui-client.test.ts` pins; the
// bodies are implemented once that suite is confirmed red.

import type { RequestRow } from "@kamerton/db";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";
import { applyJsonPatch } from "@kamerton/lib/src/dashboard/json-patch.ts";
import type { ConversationMessage, DashboardState } from "./dashboard-state.ts";

/** The `AguiEvent["type"]` discriminant values this client recognizes —
 *  anything else is a "recognized-shape-but-unknown type" per the baseline
 *  spec's "Unknown event types are ignored safely" scenario. */
const KNOWN_EVENT_TYPES = new Set<AguiEvent["type"]>([
  "RUN_STARTED",
  "RUN_FINISHED",
  "RUN_ERROR",
  "TEXT_MESSAGE_START",
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_END",
  "STATE_SNAPSHOT",
  "STATE_DELTA",
  "CUSTOM",
]);

/** One chat message inside a conversation's `ChatStream` (baseline spec's
 *  "Live conversation view" requirement). `streaming` is true between
 *  `TEXT_MESSAGE_START` and `TEXT_MESSAGE_END`. `role` distinguishes the
 *  lead's own lines from the agent's: live AG-UI text is always the agent
 *  (`"assistant"`) side; the lead's lines enter only via the persisted-
 *  transcript seed (`seedConversationsFromActiveRequests`), so the panel
 *  survives a page reload showing both sides. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming: boolean;
}

/** One conversation's live state — its `threadId` (the Telegram chat id,
 *  per `events.ts`'s header comment), whether a run is currently in
 *  progress (drives the "visible activity indicator" scenario), and its
 *  ordered chat messages. */
export interface ConversationState {
  threadId: string;
  runActive: boolean;
  messages: ChatMessage[];
}

/** The intake fields a `RequestCard` renders (baseline spec's "Live request
 *  card state" requirement) — a loose `Record` so `applyJsonPatch` can
 *  patch/add/remove any of these top-level paths without a rigid class
 *  shape getting in the way. Every field defaults to `null` (unknown yet). */
export interface RequestCardFields {
  studentName: string | null;
  studentAge: number | null;
  format: string | null;
  goalTag: string | null;
  goalText: string | null;
  tastes: string | null;
  dreamSong: string | null;
  experience: string | null;
  comfort: string | null;
  preferredWeekdays: string | null;
  preferredTimeRange: string | null;
  [key: string]: unknown;
}

/** RFC 6901 top-level pointers `applyJsonPatch` accepts for a
 *  `RequestCardFields` state — mirrors `RequestCardFields`'s own keys
 *  1-for-1, camelCase (design.md's AG-UI contract uses camelCase field
 *  names on the wire, matching this client's own types, not the
 *  snake_case DB column names). */
export const REQUEST_CARD_KNOWN_PATHS = [
  "/studentName",
  "/studentAge",
  "/format",
  "/goalTag",
  "/goalText",
  "/tastes",
  "/dreamSong",
  "/experience",
  "/comfort",
  "/preferredWeekdays",
  "/preferredTimeRange",
] as const;

export const EMPTY_REQUEST_CARD_FIELDS: RequestCardFields = {
  studentName: null,
  studentAge: null,
  format: null,
  goalTag: null,
  goalText: null,
  tastes: null,
  dreamSong: null,
  experience: null,
  comfort: null,
  preferredWeekdays: null,
  preferredTimeRange: null,
};

/** The payload a `CUSTOM` `BOOKING_PENDING` AG-UI event carries — shape
 *  mirrors `apps/dashboard/lib/dashboard-state.ts`'s own `PendingQueueEntry`
 *  (the same fields the SQLite-backed snapshot's queue entries carry), so a
 *  live `BOOKING_PENDING` event and a `STATE_SNAPSHOT`-sourced queue entry
 *  render identically. */
export interface BookingPendingPayload {
  requestId: number;
  leadId: number;
  telegramChatId: string;
  studentName: string | null;
  studentAge: number | null;
  brief: string;
  bookingId: number;
  calendarEventId: string | null;
  slotStart: string;
  slotEnd: string;
}

/** The dashboard client's whole reducer state (design.md's AG-UI contract).
 *
 * - `dashboard` is the SQLite-backed truth, replaced WHOLESALE whenever a
 *   `STATE_SNAPSHOT` arrives with `threadId === "dashboard"` (the SSE
 *   route's own on-connect frame, `apps/dashboard/app/api/agui/stream/route.ts`).
 * - `requestCards` holds each in-progress conversation's own intake-field
 *   state, keyed by `threadId` — replaced wholesale by a per-thread
 *   `STATE_SNAPSHOT`, patched by a per-thread `STATE_DELTA` (the bot's own
 *   published events, `packages/bot/src/agui-publisher.ts`).
 * - `conversations` holds each thread's live `ChatStream` messages.
 * - `livePendingQueue` holds `BOOKING_PENDING` entries that arrived as a
 *   live event (merged with `dashboard.pendingQueue` by the page/section
 *   6.9 — kept separate here so a `STATE_SNAPSHOT` replacing `dashboard`
 *   doesn't silently drop a request that went pending between the last
 *   ingest-based `STATE_SNAPSHOT` and now).
 */
export interface DashboardClientState {
  connected: boolean;
  dashboard: DashboardState | null;
  conversations: Record<string, ConversationState>;
  requestCards: Record<string, RequestCardFields>;
  livePendingQueue: BookingPendingPayload[];
}

export const initialDashboardClientState: DashboardClientState = {
  connected: false,
  dashboard: null,
  conversations: {},
  requestCards: {},
  livePendingQueue: [],
};

/**
 * Parses one SSE frame's `data` payload as an `AguiEvent`. Returns `null`
 * (NEVER throws) for non-JSON data and for a recognized-shape-but-unknown
 * `type` (e.g. a future `TOOL_CALL_*` event this MVP does not render) —
 * baseline spec's "Unknown event types are ignored safely" and
 * "Unparseable event payload is dropped" scenarios.
 */
export function safeParseAguiEvent(data: string): AguiEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const type = (parsed as { type?: unknown }).type;
  if (typeof type !== "string" || !KNOWN_EVENT_TYPES.has(type as AguiEvent["type"])) {
    return null;
  }

  if (type === "CUSTOM") {
    const name = (parsed as { name?: unknown }).name;
    if (name !== "BOOKING_PENDING") {
      return null;
    }
  }

  return parsed as AguiEvent;
}

/** Ensures `conversations[threadId]` exists, returning a shallow-cloned
 *  conversations map (never mutates the caller's map). */
function ensureConversation(
  conversations: Record<string, ConversationState>,
  threadId: string,
): Record<string, ConversationState> {
  if (conversations[threadId] !== undefined) return conversations;
  return { ...conversations, [threadId]: { threadId, runActive: false, messages: [] } };
}

/** The same snake_case -> camelCase 1:1 field mapping as
 *  `request-card-fields.ts`'s own `requestRowToCardFields` — duplicated
 *  here (not imported) to avoid a mixed type/value import cycle between
 *  this module and that thin bridge file (`request-card-fields.ts` imports
 *  `RequestCardFields`, a type-only import, FROM this module). Used only
 *  to seed a fresh `requestCards[threadId]` entry from DB truth. */
function requestRowToInitialCardFields(row: RequestRow): RequestCardFields {
  return {
    studentName: row.student_name,
    studentAge: row.student_age,
    format: row.format,
    goalTag: row.goal_tag,
    goalText: row.goal_text,
    tastes: row.tastes,
    dreamSong: row.dream_song,
    experience: row.experience,
    comfort: row.comfort,
    preferredWeekdays: row.preferred_weekdays,
    preferredTimeRange: row.preferred_time_range,
  };
}

/** Review-gate FIX 2 [MAJOR] (extended — see this function's last
 *  paragraph): seeds `conversations[threadId]` AND `requestCards[threadId]`
 *  for every DB-truth active request that does not already have one —
 *  called both for `DashboardApp`'s own INITIAL reducer state (from
 *  `initialSnapshot.activeRequests`, the server-rendered snapshot) and from
 *  this module's own `STATE_SNAPSHOT` (`threadId === "dashboard"`) branch
 *  below (a reconnect frame). Without this, a mid-intake lead's card stays
 *  hidden behind the "Поки що тихо" empty state until their NEXT live
 *  `RUN_STARTED`/`TEXT_MESSAGE_*` turn — the panel must show DB truth from
 *  the very first paint (baseline spec).
 *
 *  Never clobbers an existing entry: a conversation/card that already has
 *  live data (messages, a live-patched card) for that thread is left
 *  exactly as is — only a THREAD ID this map has never seen before gets a
 *  fresh placeholder. Pure; never mutates its inputs.
 *
 *  EXTENSION beyond the literal "seed conversations" fix: also seeding
 *  `requestCards` (not just `conversations`) is required so review-gate
 *  FIX 3's `STATE_DELTA`-for-unknown-thread guard (this file's `STATE_DELTA`
 *  branch below) does not silently and PERMANENTLY drop every future delta
 *  for a resumed conversation the dashboard never happened to see a live
 *  `STATE_SNAPSHOT` for — `pipeline.ts` emits a per-thread `STATE_SNAPSHOT`
 *  only ONCE, ever, on a lead's very first turn (`isBrandNewLead`), so a
 *  request row already active in the server-rendered/reconnect snapshot
 *  would otherwise never get a `requestCards` entry any other way, and
 *  every `STATE_DELTA` after that thread's resume would be ignored (FIX 3)
 *  instead of just this specific thread never catching up. That card was
 *  already correctly rendered via `DashboardApp`'s own
 *  `requestRowToCardFields(activeRequest)` render-time fallback, so this
 *  seeded value cannot regress what is on screen — it only makes the
 *  reducer's own `requestCards` map consistent with what is already
 *  rendered, so a subsequent live delta actually lands. */
export function seedConversationsFromActiveRequests(
  conversations: Record<string, ConversationState>,
  requestCards: Record<string, RequestCardFields>,
  activeRequests: RequestRow[],
  messagesByThread: Record<string, ConversationMessage[]> = {},
): { conversations: Record<string, ConversationState>; requestCards: Record<string, RequestCardFields> } {
  let nextConversations = conversations;
  let nextRequestCards = requestCards;
  for (const request of activeRequests) {
    const threadId = request.telegram_chat_id;
    if (nextConversations[threadId] === undefined) {
      // Rehydrate the panel from the durable transcript (if any) so a page
      // reload shows the conversation on first paint instead of an empty box
      // until the next live SSE turn. Seeded lines are never `streaming` and
      // carry a stable, synthetic id (never the ephemeral live AG-UI uuid
      // space), so a subsequent live `TEXT_MESSAGE_*` appends cleanly on top.
      const seededMessages: ChatMessage[] = (messagesByThread[threadId] ?? []).map((message, index) => ({
        id: `seed-${threadId}-${index}`,
        role: message.role,
        text: message.content,
        streaming: false,
      }));
      nextConversations = { ...nextConversations, [threadId]: { threadId, runActive: false, messages: seededMessages } };
    }
    if (nextRequestCards[threadId] === undefined) {
      nextRequestCards = { ...nextRequestCards, [threadId]: requestRowToInitialCardFields(request) };
    }
  }
  return { conversations: nextConversations, requestCards: nextRequestCards };
}

/** Finds which thread owns `messageId` (TEXT_MESSAGE_CONTENT/END carry no
 *  `threadId` of their own — see `events.ts`'s wire shape) by scanning every
 *  conversation's messages. Returns `undefined` if no thread has ever seen
 *  a `TEXT_MESSAGE_START` for that id (a stray CONTENT/END is dropped, same
 *  "never corrupt existing state" discipline as the unknown-request-id
 *  scenario). */
function findThreadForMessage(
  conversations: Record<string, ConversationState>,
  messageId: string,
): string | undefined {
  for (const [threadId, conversation] of Object.entries(conversations)) {
    if (conversation.messages.some((message) => message.id === messageId)) {
      return threadId;
    }
  }
  return undefined;
}

/** Rewrites the message with `messageId` inside `conversations[threadId]`,
 *  returning a new conversations map (never mutates the caller's map). */
function updateMessage(
  conversations: Record<string, ConversationState>,
  threadId: string,
  messageId: string,
  update: (message: ChatMessage) => ChatMessage,
): Record<string, ConversationState> {
  const conversation = conversations[threadId];
  if (conversation === undefined) return conversations;
  const messages = conversation.messages.map((message) => (message.id === messageId ? update(message) : message));
  return { ...conversations, [threadId]: { ...conversation, messages } };
}

/** The set of request ids the client currently knows about — from the
 *  SQLite-backed `dashboard` snapshot's active requests/pending queue, plus
 *  any already-live `BOOKING_PENDING` entries. A `BOOKING_PENDING` for a
 *  request id outside this set is dropped (baseline spec's "Event
 *  referencing an unknown request id is ignored" scenario). */
function knownRequestIds(state: DashboardClientState): Set<number> {
  const ids = new Set<number>();
  for (const request of state.dashboard?.activeRequests ?? []) ids.add(request.id);
  for (const entry of state.dashboard?.pendingQueue ?? []) ids.add(entry.requestId);
  for (const entry of state.livePendingQueue) ids.add(entry.requestId);
  return ids;
}

function isBookingPendingPayload(value: unknown): value is BookingPendingPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { requestId?: unknown }).requestId === "number"
  );
}

/**
 * The pure client-side reducer: folds one `AguiEvent` into `state`, NEVER
 * mutating `state` itself (same purity discipline as `lib/`'s own
 * `applyJsonPatch`). An event referencing an unknown thread/request id is
 * dropped without corrupting existing state (baseline spec's "Event
 * referencing an unknown request id is ignored" scenario).
 */
export function applyAguiEvent(state: DashboardClientState, event: AguiEvent): DashboardClientState {
  switch (event.type) {
    case "RUN_STARTED": {
      const conversations = ensureConversation(state.conversations, event.threadId);
      return {
        ...state,
        conversations: { ...conversations, [event.threadId]: { ...conversations[event.threadId]!, runActive: true } },
      };
    }

    case "RUN_FINISHED": {
      const conversation = state.conversations[event.threadId];
      if (conversation === undefined) return state;
      return {
        ...state,
        conversations: { ...state.conversations, [event.threadId]: { ...conversation, runActive: false } },
      };
    }

    case "RUN_ERROR": {
      const conversation = state.conversations[event.threadId];
      if (conversation === undefined) return state;
      return {
        ...state,
        conversations: { ...state.conversations, [event.threadId]: { ...conversation, runActive: false } },
      };
    }

    case "TEXT_MESSAGE_START": {
      const conversations = ensureConversation(state.conversations, event.threadId);
      const conversation = conversations[event.threadId]!;
      // Live streamed text is always the agent's reply — the lead's own
      // messages are never streamed over AG-UI (they arrive via the persisted
      // transcript seed, see `seedConversationsFromActiveRequests`).
      const newMessage: ChatMessage = { id: event.messageId, role: "assistant", text: "", streaming: true };
      return {
        ...state,
        conversations: {
          ...conversations,
          [event.threadId]: { ...conversation, messages: [...conversation.messages, newMessage] },
        },
      };
    }

    case "TEXT_MESSAGE_CONTENT": {
      const threadId = findThreadForMessage(state.conversations, event.messageId);
      if (threadId === undefined) return state; // stray chunk for a message we never started
      return {
        ...state,
        conversations: updateMessage(state.conversations, threadId, event.messageId, (message) => ({
          ...message,
          text: message.text + event.delta,
        })),
      };
    }

    case "TEXT_MESSAGE_END": {
      const threadId = findThreadForMessage(state.conversations, event.messageId);
      if (threadId === undefined) return state;
      return {
        ...state,
        conversations: updateMessage(state.conversations, threadId, event.messageId, (message) => ({
          ...message,
          streaming: false,
        })),
      };
    }

    case "STATE_SNAPSHOT": {
      if (event.threadId === "dashboard") {
        const snapshot = event.snapshot as DashboardState;
        // Review-gate FIX 2: a dashboard-scoped snapshot (initial load and
        // every reconnect) seeds a conversation + request-card placeholder
        // for any active request this client has not yet seen a live event
        // for (see `seedConversationsFromActiveRequests`'s own header for
        // why `requestCards` is seeded too).
        const seeded = seedConversationsFromActiveRequests(
          state.conversations,
          state.requestCards,
          snapshot.activeRequests,
          snapshot.conversationMessages,
        );
        // Reconcile the client-only `livePendingQueue` against this now-
        // authoritative snapshot: drop any live entry for a request the
        // snapshot shows as RESOLVED — active but no longer in its
        // `pendingQueue` (confirmed/declined), or already under
        // `confirmedBookings`. Without this a lead the teacher just confirmed
        // (or declined) via `/api/decisions` — which broadcasts a fresh
        // snapshot — would linger in the queue forever, because `mergePendingQueue`
        // lets a live entry win on a shared requestId. Entries the snapshot
        // does not know about yet (a hold that arrived after it was built) are
        // kept, so a genuinely-newer live pending is never dropped.
        const stillPendingIds = new Set(snapshot.pendingQueue.map((entry) => entry.requestId));
        const resolvedIds = new Set<number>();
        for (const request of snapshot.activeRequests) {
          if (!stillPendingIds.has(request.id)) resolvedIds.add(request.id);
        }
        for (const booking of snapshot.confirmedBookings ?? []) resolvedIds.add(booking.requestId);
        const livePendingQueue = state.livePendingQueue.filter((entry) => !resolvedIds.has(entry.requestId));
        return {
          ...state,
          dashboard: snapshot,
          conversations: seeded.conversations,
          requestCards: seeded.requestCards,
          livePendingQueue,
        };
      }
      return {
        ...state,
        requestCards: { ...state.requestCards, [event.threadId]: event.snapshot as RequestCardFields },
      };
    }

    case "STATE_DELTA": {
      // Review-gate FIX 3 [MAJOR]: a STATE_DELTA for a threadId this client
      // has no prior card for is ignored outright — the pipeline always
      // emits a STATE_SNAPSHOT before any STATE_DELTA for a brand-new
      // thread (`packages/bot/src/pipeline.ts`'s own pinned algorithm), so a
      // bare delta with no snapshot behind it is unexpected wire traffic
      // for a request this dashboard has no other truth about at all —
      // spec.md's "Event referencing an unknown request id is ignored".
      const current = state.requestCards[event.threadId];
      if (current === undefined) return state;
      const patched = applyJsonPatch(current as Record<string, unknown>, event.delta, REQUEST_CARD_KNOWN_PATHS);
      return {
        ...state,
        requestCards: { ...state.requestCards, [event.threadId]: patched as RequestCardFields },
      };
    }

    case "CUSTOM": {
      if (event.name !== "BOOKING_PENDING" || !isBookingPendingPayload(event.value)) return state;
      const payload = event.value;
      if (!knownRequestIds(state).has(payload.requestId)) return state; // unknown request id: dropped
      const withoutExisting = state.livePendingQueue.filter((entry) => entry.requestId !== payload.requestId);
      return { ...state, livePendingQueue: [...withoutExisting, payload] };
    }

    default:
      return state; // exhaustive per AguiEvent's union; unreachable in practice
  }
}

/**
 * Opens the dashboard's SSE connection (`GET /api/agui/stream`) and calls
 * `onEvent` for every successfully-parsed event, in arrival order. Returns
 * a cleanup function that closes the underlying `EventSource`.
 */
export interface ConnectAguiLifecycle {
  /** Fires once the SSE connection is (re)established — native
   *  `EventSource`'s own `open` event, including automatic reconnects. */
  onOpen?: () => void;
  /** Fires when the connection drops (native `EventSource`'s own `error`
   *  event) — `EventSource` retries automatically, so `onOpen` fires again
   *  on success; this callback exists purely to drive a visible
   *  `ConnectionIndicator` (baseline spec's "Disconnected state is
   *  visible, not silent" scenario), never to stop the browser's own
   *  automatic-reconnect behavior. */
  onError?: () => void;
}

export function connectAgui(onEvent: (event: AguiEvent) => void, lifecycle: ConnectAguiLifecycle = {}): () => void {
  const source = new EventSource("/api/agui/stream");
  source.onmessage = (message: MessageEvent<string>) => {
    const parsed = safeParseAguiEvent(message.data);
    if (parsed !== null) onEvent(parsed);
  };
  source.onopen = () => lifecycle.onOpen?.();
  source.onerror = () => lifecycle.onError?.();
  return () => source.close();
}
