import { detectLang, type Lang } from '../util/lang.js';
import type { Clarification, OutboundQuestion } from './types.js';

// Shape the outbound clarifying message from a Clarification (design D3). The estimate-path
// question prose is already written by the model in the user's language (ADR-0015); the code-raised
// disambiguation prompt is localized here via src/util/lang.ts (no new detectLang copy — invariant
// #6, backend-conventions #12). `options` pass through with English `value`s for the inline keyboard
// (the label is what the button shows); absent options mean the answer is free text.

const DISAMBIGUATION_PROMPT: Record<Lang, (name: string) => string> = {
  uk: (name) => `Який саме «${name}»? Обери варіант:`,
  ru: (name) => `Какой именно «${name}»? Выбери вариант:`,
  en: (name) => `Which "${name}"? Pick one:`,
};

export const buildQuestion = (clarification: Clarification, text: string): OutboundQuestion => {
  const question =
    clarification.kind === 'disambiguation'
      ? DISAMBIGUATION_PROMPT[detectLang(text)](clarification.question)
      : clarification.question;

  if (clarification.options && clarification.options.length > 0) {
    return { text: question, options: clarification.options };
  }

  return { text: question };
};
