import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  TELEGRAM_PHOTO_MEDIA_TYPE,
  parseStructured,
  type StructuredImage,
} from '../llm/structured.js';

// Progress-photo vision call (US-8, §8.5, design D2). A body photo streams to the model in EXACTLY
// ONE call through the shared seam (invariant #5, no agent loop, no re-vision) and comes back as a
// single prose field. The observations are qualitative — the model emits NO numbers here (invariant
// #2 forbids a fabricated body-fat % / diagnosis). The image bytes live only in the base64 argument
// and are never persisted (invariant #4). Language is decided IN the prompt (design D6): mirror the
// caption; a caption-less armed photo has no language signal, so default to Russian.

const progressSchema = z.object({
  observations: z
    .string()
    .describe(
      'qualitative prose observations about visible body-composition markers — NO numbers, NO body-fat %, NO diagnosis',
    ),
});

/**
 * ONE vision call (invariant #5): the photo + an optional caption go to the shared seam and return
 * qualitative prose observations in the honest coach voice. The prompt keys the model on visible
 * markers (esp. the belly in profile), forbids a body-fat percentage or any diagnosis/number
 * (invariant #2), and sets the language rule (invariant #6, design D6). Returns the observations
 * string; no follow-up round-trip.
 */
export const analyzeProgress = async (
  client: Anthropic,
  imageBase64: string,
  caption: string,
): Promise<string> => {
  const captionLine =
    caption.trim() === ''
      ? ' There is no caption — respond in Ukrainian.' // TEMPORAL DEMO HACK (drop after demo): was Russian.
      : ` The user's caption: "${caption}". Respond in the caption's language.`;
  const userText =
    'This is a body progress photo from a user on a cut. Describe what is visibly changing in ' +
    'honest coach voice, keyed on visible markers — especially the belly in profile (midsection ' +
    'definition/roundness, posture, overall leanness). Do NOT state a body-fat percentage, do NOT ' +
    'give any medical or clinical diagnosis, and do NOT invent any number — qualitative prose ' +
    `only.${captionLine}`;

  const images: StructuredImage[] = [{ data: imageBase64, mediaType: TELEGRAM_PHOTO_MEDIA_TYPE }];
  const { data } = await parseStructured(client, progressSchema, userText, {
    images,
    label: 'progress-analyze',
  });

  return data.observations;
};
