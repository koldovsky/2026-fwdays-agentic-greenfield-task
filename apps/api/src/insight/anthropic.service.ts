import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { InsightSummary } from '@honeydo/shared';

/** Default Claude model; override with `ANTHROPIC_MODEL`. Kept out of the spec so it can't drift. */
const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const TIMEOUT_MS = 4000;
const MAX_TOKENS = 128;

/**
 * The generation contract given to the model. The hard rules mirror the server-side guardrail
 * (`sanitizeInsight`) so most outputs pass; anything that slips through is still caught there.
 */
const SYSTEM_PROMPT = [
  "You write one short, calm sentence about a person's time tracking for today.",
  'Input is a JSON numeric summary (per-day seconds, totals, top tags) — never raw logs.',
  'Rules: at most 200 characters; English; no emojis; exactly one sentence;',
  'only mention numbers that appear in the summary and never invent figures;',
  'be specific and encouraging, not generic. Reply with the sentence only, no preamble.',
].join(' ');

/**
 * Thin wrapper over the Anthropic SDK — the single seam where the LLM is called, and only
 * server-side (TC-STACK-07, FR-INSIGHT-02). When no API key is configured the service is
 * **disabled** and callers use the deterministic fallback instead (FR-INSIGHT-06).
 */
@Injectable()
export class AnthropicService {
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get<string>('ANTHROPIC_MODEL')?.trim() || DEFAULT_MODEL;
  }

  /** Whether an API key is configured; when false, callers must fall back. */
  isEnabled(): boolean {
    return this.client !== null;
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Generate the raw insight text for a summary. Throws on timeout (~4s) or any SDK error so the
   * caller degrades to the deterministic fallback; it never returns partial/garbage silently.
   */
  async generate(summary: InsightSummary): Promise<string> {
    if (!this.client) throw new Error('Anthropic API key not configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: JSON.stringify(summary) }],
        },
        { signal: controller.signal },
      );
      return res.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join(' ')
        .trim();
    } finally {
      clearTimeout(timer);
    }
  }
}
