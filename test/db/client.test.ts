import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.js';

// Constructing the client does not connect — this asserts the generated client matches the schema:
// the five core models exist as delegates with the expected (camelCase) names.
describe('prisma client', () => {
  it('exposes the five core model delegates', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.foodDatabase).toBeDefined();
    expect(prisma.foodLog).toBeDefined();
    expect(prisma.bodyMetric).toBeDefined();
    expect(prisma.review).toBeDefined();
  });
});
