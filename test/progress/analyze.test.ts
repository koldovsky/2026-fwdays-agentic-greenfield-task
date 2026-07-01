import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { analyzeProgress } from '../../src/progress/analyze.js';

// The progress vision call issues EXACTLY ONE request (invariant #5) carrying the image block BEFORE
// the text (base64 + jpeg media type), the prompt forbids a body-fat %/diagnosis and carries the
// belly-in-profile marker + the language rule (invariant #6/#2), and the parsed observations return.

const makeAnthropic = (
  observations = 'Живот в профиль стал заметно площе, талия подтянулась.',
): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ observations }) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
};

describe('analyzeProgress', () => {
  it('issues exactly one vision call with the image block before the text and returns the observations', async () => {
    const { client, create } = makeAnthropic();

    const observations = await analyzeProgress(client, 'BASE64', 'мой прогресс');

    expect(create).toHaveBeenCalledTimes(1); // one vision call, no loop (invariant #5)
    const params = create.mock.calls[0]?.[0] as {
      messages: {
        content: (
          { type: string; source?: { media_type: string; data: string } } | { type: string }
        )[];
      }[];
    };
    const blocks = params.messages[0]?.content as {
      type: string;
      source?: { media_type: string; data: string };
    }[];
    expect(blocks[0]?.type).toBe('image'); // image before the text
    expect(blocks[0]?.source?.media_type).toBe('image/jpeg');
    expect(blocks[0]?.source?.data).toBe('BASE64');
    expect(blocks[1]?.type).toBe('text');
    expect(observations).toContain('профиль');
  });

  it('the prompt carries the caption, the belly-in-profile marker, the no-body-fat/no-diagnosis rule, and mirrors the caption language', async () => {
    const { client, create } = makeAnthropic();

    await analyzeProgress(client, 'BASE64', 'мой прогресс');

    const params = create.mock.calls[0]?.[0] as {
      messages: { content: { type: string; text?: string }[] }[];
    };
    const text = (params.messages[0]?.content.find((b) => b.type === 'text') as { text: string })
      .text;
    expect(text).toContain('мой прогресс'); // the caption is passed
    expect(text.toLowerCase()).toContain('belly in profile'); // the load-bearing marker
    expect(text.toLowerCase()).toContain('body-fat percentage'); // forbidden
    expect(text.toLowerCase()).toContain('diagnosis'); // forbidden
    expect(text).toContain("caption's language"); // mirror rule (invariant #6)
  });

  it('defaults to Russian in the prompt when there is no caption (design D6)', async () => {
    const { client, create } = makeAnthropic();

    await analyzeProgress(client, 'BASE64', '');

    const params = create.mock.calls[0]?.[0] as {
      messages: { content: { type: string; text?: string }[] }[];
    };
    const text = (params.messages[0]?.content.find((b) => b.type === 'text') as { text: string })
      .text;
    expect(text).toContain('respond in Russian'); // no caption → Russian default, not detectLang
  });
});
