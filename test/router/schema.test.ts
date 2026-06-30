import { describe, expect, it } from 'vitest';
import { makeRouterSchema } from '../../src/router/schema.js';

describe('makeRouterSchema', () => {
  it('excludes "answer" from the intent enum when no question is pending', () => {
    const schema = makeRouterSchema(false);
    expect(schema.safeParse({ intent: 'log', date: 'today' }).success).toBe(true);
    expect(schema.safeParse({ intent: 'answer', date: 'today' }).success).toBe(false);
  });

  it('allows "answer" when a question is pending', () => {
    const schema = makeRouterSchema(true);
    expect(schema.safeParse({ intent: 'answer', date: 'today' }).success).toBe(true);
  });
});
