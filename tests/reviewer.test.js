'use strict';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

jest.mock('fs');

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const { reviewBusinessService, parseReviewResponse } = require('../src/vertex/reviewer');

const FAKE_SA = JSON.stringify({ project_id: 'test-project' });

const VALID_REVIEW_JSON = `\`\`\`json
{
  "reviewScore": 85,
  "reviewResult": "green",
  "reviewText": "## Загальна оцінка\\nOK"
}
\`\`\``;

const BASE_CONFIG = {
  ai: {
    vertex: {
      location: 'europe-central2',
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 1,
        safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }],
      },
      thinkingConfig: { thinkingBudget: 8192 },
      tools: [],
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
  fs.readFileSync.mockImplementation((filePath) => {
    if (String(filePath).endsWith('service-account.json')) return FAKE_SA;
    return '';
  });
  fs.existsSync.mockReturnValue(false);
  mockGenerateContent.mockResolvedValue({ text: VALID_REVIEW_JSON });
});

// ─── parseReviewResponse ─────────────────────────────────────────────────────

describe('parseReviewResponse', () => {
  it('повертає { reviewText, reviewScore, reviewResult }', () => {
    const result = parseReviewResponse(VALID_REVIEW_JSON);
    expect(result).toEqual({
      reviewText:   '## Загальна оцінка\nOK',
      reviewScore:  85,
      reviewResult: 'green',
    });
  });

  it('кидає якщо немає ```json блоку', () => {
    expect(() => parseReviewResponse('just text')).toThrow('JSON блок');
  });

  it('кидає якщо reviewResult невалідний', () => {
    const bad = '```json\n{"reviewScore":80,"reviewResult":"UNKNOWN","reviewText":"ok"}\n```';
    expect(() => parseReviewResponse(bad)).toThrow('Невалідний reviewResult');
  });
});

// ─── reviewBusinessService — null guard ──────────────────────────────────────

describe('reviewBusinessService — null guard', () => {
  it('повертає null якщо scripts порожній без виклику GoogleGenAI', async () => {
    const result = await reviewBusinessService({ ...SAMPLE_DATA, scripts: [] }, BASE_CONFIG);
    expect(result).toBeNull();
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });
});

// ─── reviewBusinessService — PROJECT_ID ──────────────────────────────────────

describe('reviewBusinessService — PROJECT_ID', () => {
  it('читає project_id з service-account.json', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'test-project' })
    );
  });
});

// ─── reviewBusinessService — конфігурація Vertex AI ──────────────────────────

describe('reviewBusinessService — конфігурація Vertex AI', () => {
  it('передає vertexai: true та location з config', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({ vertexai: true, location: 'europe-central2' })
    );
  });

  it('передає safetySettings у generateContent', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.safetySettings).toEqual(
      BASE_CONFIG.ai.vertex.generationConfig.safetySettings
    );
  });

  it('передає thinkingConfig у generateContent', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.thinkingConfig).toEqual(BASE_CONFIG.ai.vertex.thinkingConfig);
  });

  it('maxOutputTokens передається в config', async () => {
    await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.maxOutputTokens).toBe(1000);
  });
});

// ─── reviewBusinessService — результат ───────────────────────────────────────

describe('reviewBusinessService — результат', () => {
  it('повертає { reviewText, reviewScore, reviewResult }', async () => {
    const result = await reviewBusinessService(SAMPLE_DATA, BASE_CONFIG);
    expect(result).toMatchObject({
      reviewScore:  85,
      reviewResult: 'green',
      reviewText:   expect.any(String),
    });
  });

  it('кидає якщо Vertex не повернув JSON блок', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'просто текст без JSON' });
    await expect(reviewBusinessService(SAMPLE_DATA, BASE_CONFIG)).rejects.toThrow('JSON блок');
  });
});
