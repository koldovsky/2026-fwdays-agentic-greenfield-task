import type Anthropic from '@anthropic-ai/sdk';
import type { InlineKeyboard } from 'grammy';
import type { FoodService } from '../food/types.js';
import type { MetricsService } from '../metrics/types.js';
import type { OnboardingService } from '../onboarding/types.js';

/** Dependencies the message handlers need (the LLM client, the user's timezone, onboarding, food). */
export interface BotDeps {
  anthropic: Anthropic;
  userTz: string;
  onboarding: OnboardingService;
  food: FoodService;
  metrics: MetricsService;
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
