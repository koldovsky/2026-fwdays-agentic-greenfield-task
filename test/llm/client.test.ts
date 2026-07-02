import { describe, expect, it, vi } from 'vitest';

// The Anthropic SDK is mocked at module scope so constructing the client makes no network call and
// we can assert the explicit retry/timeout posture (ADR-0023) is passed — not left to SDK defaults.
const ctor = vi.hoisted(() => vi.fn());
vi.mock('@anthropic-ai/sdk', () => ({ default: ctor }));

import { createAnthropicClient } from '../../src/llm/client.js';

describe('createAnthropicClient', () => {
  it('instantiates with an explicit bounded retry count and request timeout', () => {
    createAnthropicClient('test-key');

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith({ apiKey: 'test-key', maxRetries: 3, timeout: 60_000 });
  });
});
