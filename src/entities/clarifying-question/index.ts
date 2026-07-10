// Public API barrel for the clarifying-question entity — other layers import ONLY this.
export type {
  ClarifyingQuestion,
  ClarifyingAnswer,
  ClarifyingAnswerStatus,
} from "./model/types";
export {
  deriveClarifyingQuestions,
  MAX_CLARIFYING_QUESTIONS,
} from "./lib/derive";
