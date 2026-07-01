'use strict';

const { formatJiraComment } = require('../src/jira/issues');

describe('formatJiraComment — заголовки', () => {
  it('## → h2.', () => {
    expect(formatJiraComment('## Загальна оцінка')).toBe('h2. Загальна оцінка');
  });

  it('### → h3.', () => {
    expect(formatJiraComment('### Script Init')).toBe('h3. Script Init');
  });

  it('не чіпає # без пробілу (не заголовок)', () => {
    const input = '#not-a-heading';
    expect(formatJiraComment(input)).toBe(input);
  });
});

describe('formatJiraComment — форматування тексту', () => {
  it('**bold** → *bold*', () => {
    expect(formatJiraComment('**Критично**')).toBe('*Критично*');
  });

  it('inline `code` → {{code}}', () => {
    expect(formatJiraComment('Script `Init` має помилку')).toBe('Script {{Init}} має помилку');
  });

  it('code block → {code}', () => {
    const input = '```js\nvar x = 1;\n```';
    expect(formatJiraComment(input)).toBe('{code}var x = 1;\n{code}');
  });

  it('code block без мови → {code}', () => {
    const input = '```\nvar x = 1;\n```';
    expect(formatJiraComment(input)).toBe('{code}var x = 1;\n{code}');
  });
});

describe('formatJiraComment — edge cases', () => {
  it('порожній рядок → порожній рядок', () => {
    expect(formatJiraComment('')).toBe('');
  });

  it('текст без markdown → без змін', () => {
    const input = 'Просто текст без форматування';
    expect(formatJiraComment(input)).toBe(input);
  });

  it('комбінований вхід — всі правила разом', () => {
    const input = [
      '## Загальна оцінка',
      '',
      '**Знайдені проблеми:**',
      '- Script `Init`: відсутній try/catch',
      '',
      '```js',
      'var x = 1;',
      '```',
    ].join('\n');

    const result = formatJiraComment(input);
    expect(result).toContain('h2. Загальна оцінка');
    expect(result).toContain('*Знайдені проблеми:*');
    expect(result).toContain('{{Init}}');
    expect(result).toContain('{code}');
  });
});
