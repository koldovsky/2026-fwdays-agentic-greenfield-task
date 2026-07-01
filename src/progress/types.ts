import type { PrismaClient, ProgressNote } from '@prisma/client';

// Progress-photo domain shapes (US-8, §8.5). The service takes a body photo → one vision call →
// qualitative prose → one tenant-scoped text-only row. No numbers are structured (invariant #2 — the
// model emits prose); the image never reaches this layer as bytes (invariant #4 — the write signature
// only ever sees the extracted observations string).

export type { ProgressNote };

/** The bot's reply after a progress photo: the observations prose (language already decided by the model). */
export interface ProgressReply {
  text: string;
}

export interface ProgressService {
  /**
   * Analyze a body photo (one vision call) and persist the text observations for the acting user.
   * Returns the observations as a reply, or null for an unknown chat_id (no call, no write).
   */
  analyzeAndSave: (
    chatId: bigint,
    caption: string,
    imageBase64: string,
  ) => Promise<ProgressReply | null>;
}

// Narrow structural surface over Prisma — a real PrismaClient satisfies it; tests pass a cast mock.
export type ProgressClient = Pick<PrismaClient, 'user' | 'progressNote'>;
