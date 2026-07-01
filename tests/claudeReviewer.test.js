'use strict';

const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  }))
);

jest.mock('fs');
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const fs = require('fs');
const { buildPrompt, parseReviewResponse, reviewBusinessService } = require('../src/claude/reviewer');

const VALID_JSON_RESPONSE = (score, result) =>
  `## Загальна оцінка\nOK\n\n\`\`\`json\n{\n  "reviewScore": ${score},\n  "reviewResult": "${result}"\n}\n\`\`\``;

const BASE_CONFIG = {
  ai: {
    claude: {
      model: 'claude-sonnet-4-6',
      maxTokens: 16000,
      cacheMode: 'none',
      systemInstructionFile: null,
    },
  },
};

const SAMPLE_DATA = {
  workspaceName: 'dev_test_ws',
  parentName: 'MyService',
  scripts: [{ name: 'Init', body: 'function Init() {}' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  fs.existsSync.mockReturnValue(false);
  fs.readFileSync.mockReturnValue('');
});

// ─── buildPrompt ─────────────────────────────────────────────────────────────

describe('buildPrompt — null guard', () => {
  it('повертає null якщо scripts порожній', () => {
    expect(buildPrompt({ ...SAMPLE_DATA, scripts: [] })).toBeNull();
  });

  it('повертає null якщо scripts undefined', () => {
    expect(buildPrompt({ workspaceName: 'ws', parentName: 'svc', scripts: undefined })).toBeNull();
  });
});

describe('buildPrompt — структура', () => {
  let result;
  beforeAll(() => { result = buildPrompt(SAMPLE_DATA); });

  it('повертає рядок для непорожнього scripts', () => {
    expect(typeof result).toBe('string');
  });

  it('містить workspaceName', () => {
    expect(result).toContain('dev_test_ws');
  });

  it('містить parentName', () => {
    expect(result).toContain('MyService');
  });

  it('містить секцію "Формат відповіді" з JSON', () => {
    expect(result).toContain('Формат відповіді');
    expect(result).toContain('reviewScore');
    expect(result).toContain('reviewResult');
    expect(result).toContain('reviewText');  // згадується в описі формату
  });
});

// ─── parseReviewResponse ─────────────────────────────────────────────────────

describe('parseReviewResponse — успішний парсинг', () => {
  it('повертає { reviewText, reviewScore, reviewResult } для green', () => {
    const result = parseReviewResponse(VALID_JSON_RESPONSE(90, 'green'));
    expect(result).toEqual({
      reviewText:   '## Загальна оцінка\nOK',
      reviewScore:  90,
      reviewResult: 'green',
    });
  });

  it('повертає yellow', () => {
    const result = parseReviewResponse(VALID_JSON_RESPONSE(65, 'yellow'));
    expect(result.reviewResult).toBe('yellow');
  });

  it('повертає red', () => {
    const result = parseReviewResponse(VALID_JSON_RESPONSE(30, 'red'));
    expect(result.reviewResult).toBe('red');
  });
});

describe('parseReviewResponse — помилки', () => {
  it('кидає якщо немає ```json блоку', () => {
    expect(() => parseReviewResponse('просто текст без JSON')).toThrow(
      'Claude не повернув JSON блок'
    );
  });

  it('кидає якщо reviewScore не число', () => {
    const text = '## Review\n\n```json\n{"reviewScore": "abc", "reviewResult": "green"}\n```';
    expect(() => parseReviewResponse(text)).toThrow('reviewScore');
  });

  it('кидає якщо reviewResult невалідний', () => {
    const text = '## Review\n\n```json\n{"reviewScore": 80, "reviewResult": "unknown"}\n```';
    expect(() => parseReviewResponse(text)).toThrow('Невалідний reviewResult');
  });

  it('кидає якщо reviewText відсутній (JSON блок на початку без тексту перед ним)', () => {
    const text = '```json\n{"reviewScore": 80, "reviewResult": "green"}\n```';
    expect(() => parseReviewResponse(text)).toThrow('reviewText');
  });

  it('кидає при невалідному JSON', () => {
    const text = '```json\n{not: valid json}\n```';
    expect(() => parseReviewResponse(text)).toThrow('Помилка парсингу JSON');
  });
});

// ─── reviewBusinessService ────────────────────────────────────────────────────

describe('reviewBusinessService — null guard', () => {
  it('повертає null якщо scripts порожній без виклику Anthropic', async () => {
    const result = await reviewBusinessService({ ...SAMPLE_DATA, scripts: [] }, BASE_CONFIG);
    expect(result).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});

describe('reviewBusinessService — виклик API', () => {
  beforeEach(() => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ text: VALID_JSON_RESPONSE(85, 'green') }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });
  });

  it('повертає { reviewText, reviewScore, reviewResult }', async () => {
    const result = await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    expect(result).toMatchObject({
      reviewScore:  85,
      reviewResult: 'green',
      reviewText:   expect.any(String),
    });
  });

  it('використовує model з config', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const body = mockMessagesCreate.mock.calls[0][0];
    expect(body.model).toBe('claude-sonnet-4-6');
  });

  it('використовує max_tokens з config', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const body = mockMessagesCreate.mock.calls[0][0];
    expect(body.max_tokens).toBe(16000);
  });

  it('cacheMode=none → немає cache_control у system', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const body = mockMessagesCreate.mock.calls[0][0];
    expect(body.system[0].cache_control).toBeUndefined();
  });

  it('cacheMode=ephemeral → cache_control є у system і messages', async () => {
    const config = { ai: { claude: { ...BASE_CONFIG.ai.claude, cacheMode: 'ephemeral' } } };
    await reviewBusinessService(SAMPLE_DATA, config);
    const body = mockMessagesCreate.mock.calls[0][0];
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('cacheMode=extended → cache_control з ttl у system, не у messages', async () => {
    const config = { ai: { claude: { ...BASE_CONFIG.ai.claude, cacheMode: 'extended' } } };
    await reviewBusinessService(SAMPLE_DATA, config);
    const body = mockMessagesCreate.mock.calls[0][0];
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral', ttl: 3600 });
    expect(body.messages[0].content[0].cache_control).toBeUndefined();
  });
});
