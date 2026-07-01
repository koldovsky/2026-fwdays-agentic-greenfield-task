import type Anthropic from '@anthropic-ai/sdk';
import type { InlineKeyboard } from 'grammy';
import type { ClarifyStore } from '../clarify/store.js';
import type { FoodService } from '../food/types.js';
import type { MetricsService } from '../metrics/types.js';
import type { OnboardingService } from '../onboarding/types.js';
import type { QueryService } from '../query/types.js';

/** Dependencies the message handlers need (the LLM client, the user's timezone, onboarding, food). */
export interface BotDeps {
  anthropic: Anthropic;
  userTz: string;
  onboarding: OnboardingService;
  food: FoodService;
  metrics: MetricsService;
  query: QueryService;
  clarify: ClarifyStore;
}

export type ReplyFn = (text: string, other?: { reply_markup?: InlineKeyboard }) => Promise<unknown>;

// Minimal context surfaces — handlers stay unit-testable with stubs, no live grammY runtime.
export interface StartContext {
  chat?: { id: number } | undefined;
  reply: ReplyFn;
}

export interface TextContext {
  message: { text: string };
  chat?: { id: number } | undefined;
  reply: ReplyFn;
}

export interface CallbackContext {
  callbackQuery?: { data?: string };
  chat?: { id: number } | undefined;
  reply: ReplyFn;
  answerCallbackQuery: () => Promise<unknown>;
}

/** One Telegram photo size — only the fields the largest-size pick + download need. */
export interface PhotoSize {
  file_id: string;
}

/**
 * Minimal grammY photo-message surface (keeps `handlePhoto` unit-testable with a fake ctx — no live
 * runtime). `getFile` yields the file path; `api.token` builds the Telegram file endpoint. The bytes
 * are fetched into a base64 string in memory and never written to disk (invariant #4).
 */
export interface PhotoContext {
  message: { photo: PhotoSize[]; caption?: string | undefined };
  chat?: { id: number } | undefined;
  reply: ReplyFn;
  getFile: () => Promise<{ file_path?: string | undefined }>;
  api: { token: string };
}
