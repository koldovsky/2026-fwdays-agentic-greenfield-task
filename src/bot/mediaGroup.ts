import { errorMessage } from '../util/error.js';

// Ephemeral in-memory media-group buffer (design D3): grammY delivers a Telegram media group as N
// separate `message:photo` updates sharing one `ctx.message.media_group_id`, with the caption riding
// only one of them. This buffer collects each group's downloaded base64 images + its caption over a
// short debounce (reset on each arriving photo) and flushes ONCE, so the whole group becomes a single
// `logPhoto` → one vision call (invariant #5) → one reply. A photo with NO media group is a degenerate
// group of one and flushes immediately. The buffer holds only transient base64 + a scheduler handle,
// keyed by `chatId:mediaGroupId` (never the group id alone — Telegram media-group ids are unique per
// chat, so scoping the key by chat forecloses a cross-tenant flush collision, invariant #8), and is
// cleared on flush — no image bytes are ever persisted (invariant #4).

/** Debounce window before a media group is considered complete (design D3 open question; ~400ms). */
export const MEDIA_GROUP_DEBOUNCE_MS = 400;

/** What one flushed group hands back: all its images + the single group caption. */
export interface MediaGroupFlush {
  images: string[];
  caption: string;
}

/** The work to run once a group is complete — logs the images and replies (exactly once per group). */
export type FlushFn = (flush: MediaGroupFlush) => Promise<void>;

/** Cancel a pending scheduled flush. */
export type Cancel = () => void;

/**
 * Deferred-flush scheduler, injected so the buffer is unit-testable without real timers: run `fn`
 * after `ms`, returning a canceller. Production uses `setTimeout`/`clearTimeout`; tests drive a fake
 * clock (see test/bot/mediaGroup.test.ts).
 */
export type Schedule = (fn: () => void, ms: number) => Cancel;

const realSchedule: Schedule = (fn, ms) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};

interface Entry {
  images: string[];
  caption: string;
  onFlush: FlushFn;
  cancel: Cancel;
}

/** The buffer surface the bot depends on (injectable so `handlePhoto` stays unit-testable). */
export interface MediaGroupBuffer {
  /**
   * Add one downloaded photo to its group. The buffer key is scoped by `chatId` so two chats sharing
   * a `mediaGroupId` never merge (invariant #8). A photo with no `media_group_id` flushes immediately
   * (awaited, so the single-photo path stays synchronous end-to-end); a grouped photo (re)arms the
   * debounce and resolves at once — its flush fires later via the scheduler.
   */
  add: (
    chatId: bigint,
    mediaGroupId: string | undefined,
    image: string,
    caption: string,
    onFlush: FlushFn,
  ) => Promise<void>;
}

export const createMediaGroupBuffer = (
  schedule: Schedule = realSchedule,
  debounceMs: number = MEDIA_GROUP_DEBOUNCE_MS,
): MediaGroupBuffer => {
  const groups = new Map<string, Entry>();

  const flush = (key: string): void => {
    const entry = groups.get(key);
    if (!entry) {
      return;
    }
    groups.delete(key); // transient bytes released before the async work (invariant #4/#7)
    void entry.onFlush({ images: entry.images, caption: entry.caption }).catch((error: unknown) => {
      // The flush runs off the update loop (via the scheduler), so its own boundary logs message-only
      // (invariant #9) rather than surfacing an unhandled rejection.
      console.error(`[bot] media-group flush failed: ${errorMessage(error)}`);
    });
  };

  return {
    async add(chatId, mediaGroupId, image, caption, onFlush) {
      if (mediaGroupId === undefined) {
        await onFlush({ images: [image], caption });
        return;
      }

      const key = `${chatId}:${mediaGroupId}`;
      const existing = groups.get(key);
      if (existing) {
        existing.cancel();
        existing.images.push(image);
        // The caption rides one photo of the group — keep the first non-empty one.
        if (existing.caption === '' && caption !== '') {
          existing.caption = caption;
        }
        existing.onFlush = onFlush;
        existing.cancel = schedule(() => flush(key), debounceMs);
        return;
      }

      groups.set(key, {
        images: [image],
        caption,
        onFlush,
        cancel: schedule(() => flush(key), debounceMs),
      });
    },
  };
};

/** The process-wide singleton buffer wired in index.ts (the module Map behind the interface). */
export const mediaGroupBuffer: MediaGroupBuffer = createMediaGroupBuffer();
