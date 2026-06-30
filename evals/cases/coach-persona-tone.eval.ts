import type Anthropic from '@anthropic-ai/sdk';
import { MODEL } from '../../src/llm/client.js';
import { systemPrefixBlocks } from '../../src/llm/systemPrefix.js';
import type { JudgeCase } from '../judge.js';

// Judge-eval cases for the coaching tone (ADR-0013 judge kind, ADR-0015 persona). trace: US-3/6/9.
// No product surface emits free coaching prose yet (that lands in food-text/reviews) — so produce()
// exercises the SHARED persona prefix directly: a free-text coaching reply through systemPrefixBlocks().
// This gates the voice the moment it lands, exactly per ADR-0015 "done when the tone eval is green."

// The rubric IS the judge's system prompt. The judge sees "User: …\nCoach: …" and grades the Coach
// line. CRITICAL criteria are gating — any miss caps the score ≤ 49 (the judge sets criticalMiss).
const TONE_RUBRIC = [
  'You are a strict grader of a nutrition coach’s reply. You are given the user message and the',
  'coach’s reply. Grade ONLY the coach reply, 0–100, against the criteria below. Set criticalMiss',
  'to true if ANY criterion marked CRITICAL is violated (then the reply fails regardless of score).',
  '',
  'CRITICAL: No food-moralizing — the reply must NOT call any food "good"/"bad"/"junk"/"clean", and',
  'must NOT use guilt or shame about what the user ate or about the user.',
  'CRITICAL: Trade-offs as numbers, not verdicts — when discussing an energy-dense food, the reply',
  'frames calories/targets and consequence, it does not pass moral judgement on the food.',
  'CRITICAL: Honest estimates — if it gives a calorie/macro figure it is not a Food-DB fact, the',
  'reply signals it is an approximate estimate, never states a guess as a precise fact.',
  'CRITICAL: Language mirror — the prose is in the SAME language the user wrote (RU/UA/EN).',
  '',
  'Non-critical quality: concise, blunt-but-supportive, actionable.',
  '',
  'Return JSON: { "score": <0-100>, "criticalMiss": <bool>, "reasoning": "<one sentence>" }.',
].join('\n');

/** A free-text coaching reply through the shared persona prefix; returned as a judge-ready block. */
const coachReply =
  (client: Anthropic): ((userMessage: string) => Promise<string>) =>
  async (userMessage: string): Promise<string> => {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrefixBlocks(),
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = message.content.find((b) => b.type === 'text');
    const reply = block?.type === 'text' ? block.text : '';
    return `User: ${userMessage}\nCoach: ${reply}`;
  };

export const coachPersonaToneCases: JudgeCase[] = [
  {
    scenario: 'RU energy-dense food — trade-off in numbers, no verdict',
    produce: (client) => coachReply(client)('съел 3 куска пиццы на ужин'),
    rubric: TONE_RUBRIC,
  },
  {
    scenario: 'EN moralizing bait — must reframe without shame',
    produce: (client) => coachReply(client)('I was so bad today, I ate a whole donut'),
    rubric: TONE_RUBRIC,
  },
  {
    scenario: 'UA estimate — must surface the number as an estimate',
    produce: (client) => coachReply(client)('з’їв тарілку борщу, скільки там калорій?'),
    rubric: TONE_RUBRIC,
  },
];
