import { describe, expect, it } from 'vitest';
import { buildQuestion } from '../../src/clarify/question.js';
import type { Clarification } from '../../src/clarify/types.js';

// Question shaping (design D3, invariant #6): the estimate-path question prose is the model's own
// (already language-mirrored) verbatim; the code-raised disambiguation prompt (kind `disambiguation`)
// is localized here. `options` pass through unchanged, each carrying its English `value`.

const clarify: Clarification = {
  kind: 'descriptor',
  unknown: 'fat%',
  question: 'Какой жирности творог? 0 / 5 / 9%?',
  options: [
    { label: '0%', value: '0%' },
    { label: '5%', value: '5%' },
    { label: '9%', value: '9%' },
  ],
};

const disambiguation: Clarification = {
  kind: 'disambiguation',
  unknown: 'catalog-match',
  question: 'творог',
  options: [
    { label: 'творог — 121 kcal/per100g', value: '12' },
    { label: 'творог — 159 kcal/per100g', value: '34' },
  ],
};

describe('buildQuestion', () => {
  it('passes the model-written question prose through verbatim with its options', () => {
    const out = buildQuestion(clarify, '200г творога');

    expect(out.text).toBe('Какой жирности творог? 0 / 5 / 9%?');
    expect(out.options?.map((o) => o.value)).toEqual(['0%', '5%', '9%']);
  });

  it('drops empty options so an open-ended unknown takes free text (no keyboard)', () => {
    const out = buildQuestion(
      { kind: 'quantity', unknown: 'portion', question: 'Сколько грамм?' },
      'съел творог',
    );

    expect(out.text).toBe('Сколько грамм?');
    expect(out.options).toBeUndefined();
  });

  it('localizes the code-raised disambiguation prompt to the user language, keeps id choice values', () => {
    const ru = buildQuestion(disambiguation, 'записал творог');
    const uk = buildQuestion(disambiguation, 'записав сир їв');
    const en = buildQuestion(disambiguation, 'logged cottage cheese');

    expect(ru.text).toContain('Какой именно');
    expect(uk.text).toContain('Який саме');
    expect(en.text).toContain('Which');
    // Choice values stay the (English-structured) catalog row ids regardless of prose language.
    expect(ru.options?.map((o) => o.value)).toEqual(['12', '34']);
  });
});
