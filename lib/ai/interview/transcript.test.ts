import { describe, it, expect } from "vitest";
import {
  interviewTranscriptSchema,
  clampMessage,
  followupsUsed,
  priorReplies,
  bestAvailableText,
  nextInterviewQuestionId,
  hasAskedQuestion,
  type InterviewMessage,
} from "./transcript";

const transcript: InterviewMessage[] = [
  { role: "assistant", content: "Вітаю", kind: "greeting" },
  { role: "assistant", content: "Питання 1", kind: "question", questionId: "q1" },
  { role: "user", content: "коротко", questionId: "q1" },
  { role: "assistant", content: "Уточніть", kind: "followup", questionId: "q1" },
  { role: "user", content: "трохи детальніше тут", questionId: "q1" },
  { role: "assistant", content: "Питання 2", kind: "question", questionId: "q2" },
];

describe("interviewTranscriptSchema", () => {
  it("accepts a well-formed transcript", () => {
    expect(interviewTranscriptSchema.safeParse(transcript).success).toBe(true);
  });

  it("rejects a corrupt blob", () => {
    expect(interviewTranscriptSchema.safeParse([{ role: "bot", content: 1 }]).success).toBe(false);
    expect(interviewTranscriptSchema.safeParse("nope").success).toBe(false);
  });
});

describe("clampMessage", () => {
  it("leaves a short message unchanged", () => {
    expect(clampMessage("hi", 10)).toBe("hi");
  });

  it("truncates deterministically to the cap", () => {
    expect(clampMessage("abcdef", 3)).toBe("abc");
  });
});

describe("followupsUsed", () => {
  it("counts only assistant follow-ups for the given question", () => {
    expect(followupsUsed(transcript, "q1")).toBe(1);
    expect(followupsUsed(transcript, "q2")).toBe(0);
  });
});

describe("priorReplies", () => {
  it("returns the respondent replies for a question in order", () => {
    expect(priorReplies(transcript, "q1")).toEqual(["коротко", "трохи детальніше тут"]);
    expect(priorReplies(transcript, "q2")).toEqual([]);
  });
});

describe("bestAvailableText", () => {
  it("returns the longest trimmed reply", () => {
    expect(bestAvailableText(["коротко", "трохи детальніше тут"])).toBe("трохи детальніше тут");
  });

  it("returns empty string when no reply carries text", () => {
    expect(bestAvailableText(["", "   "])).toBe("");
    expect(bestAvailableText([])).toBe("");
  });
});

describe("hasAskedQuestion", () => {
  it("is true once the agent asked or followed up on a question", () => {
    expect(hasAskedQuestion(transcript, "q1")).toBe(true);
    expect(hasAskedQuestion(transcript, "q2")).toBe(true);
  });

  it("is false for a question the agent has not put yet", () => {
    expect(hasAskedQuestion(transcript, "q3")).toBe(false);
  });

  it("ignores user turns", () => {
    const onlyUser: InterviewMessage[] = [{ role: "user", content: "x", questionId: "qX" }];
    expect(hasAskedQuestion(onlyUser, "qX")).toBe(false);
  });
});

describe("nextInterviewQuestionId", () => {
  const questions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
  ];

  it("returns the first question with no recorded answer, by order", () => {
    expect(nextInterviewQuestionId(questions, ["q1"])).toBe("q2");
    expect(nextInterviewQuestionId(questions, ["q2", "q1"])).toBe("q3");
  });

  it("returns null when every question has a recorded answer", () => {
    expect(nextInterviewQuestionId(questions, ["q1", "q2", "q3"])).toBeNull();
  });

  it("returns the first question when nothing is recorded", () => {
    expect(nextInterviewQuestionId(questions, [])).toBe("q1");
  });
});
