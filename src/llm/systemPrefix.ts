import type Anthropic from '@anthropic-ai/sdk';

// The stable, prompt-cached system prefix shared by every LLM call. The honest coaching VOICE lands
// here in `coach-persona`; for now it is the minimal routing instruction. It is the seam that keeps
// the cached prefix in one place. NOTE: Sonnet 4.6 only caches prefixes >= ~2048 tokens — a short
// prefix is marked cacheable but silently won't cache until coach-persona fattens it.
export const SYSTEM_PREFIX = [
  'You are the message classifier for a personal nutrition-coaching Telegram bot.',
  'Classify each user message into exactly one of the provided intents and extract structured fields.',
  'Use "answer" only when the user is replying to a pending question; otherwise it is not offered.',
  'Mirror the user’s language only in any prose; intent and field values stay English.',
  'For the date, return the token "today" or "yesterday", or an explicit YYYY-MM-DD if the message',
  'names one. Do NOT compute the current date yourself — the application resolves the token',
  'against the user’s timezone.',
].join(' ');

/** The system prefix as a cached block. Per-message content is appended AFTER this (in `messages`). */
export const systemPrefixBlocks = (): Anthropic.TextBlockParam[] => [
  { type: 'text', text: SYSTEM_PREFIX, cache_control: { type: 'ephemeral' } },
];
