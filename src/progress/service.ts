import type Anthropic from '@anthropic-ai/sdk';
import { resolveUserId } from '../db/resolveUser.js';
import { resolveDate } from '../router/date.js';
import { analyzeProgress } from './analyze.js';
import { writeProgressNote } from './write.js';
import type { ProgressClient, ProgressReply, ProgressService } from './types.js';

// Progress-photo service (US-8, §8.5): orchestration only — resolve the tenant → ONE vision call
// (invariant #5) → persist the text observations for today (user TZ) → reply with that prose. The
// image arrives as base64 and is never persisted (invariant #4 — enforced upstream + by the fs-spy
// test + the write signature). Body/progress data is sensitive (invariant #9): never log raw values.

export const createProgressService = (
  client: ProgressClient,
  anthropic: Anthropic,
  userTz: string,
  now: () => Date = () => new Date(),
): ProgressService => ({
  async analyzeAndSave(
    chatId: bigint,
    caption: string,
    imageBase64: string,
  ): Promise<ProgressReply | null> {
    const userId = await resolveUserId(client, chatId);
    if (userId === null) {
      return null;
    }

    const observations = await analyzeProgress(anthropic, imageBase64, caption);
    const date = resolveDate('today', userTz, now());
    await writeProgressNote(client, userId, date, observations);

    return { text: observations };
  },
});
