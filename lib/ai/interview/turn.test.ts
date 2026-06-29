import { describe, it, expect } from "vitest";
import { decideTurn, DEFAULT_FOLLOWUP_CAP, type InterviewQuestion } from "./turn";

const scaleQ: InterviewQuestion = { type: "scale", anchors: [{ value: 1 }, { value: 2 }, { value: 3 }] };
const openQ: InterviewQuestion = { type: "open" };

const base = { addressesQuestion: false, scaleValue: null, currentText: "", bestText: "", followupsUsed: 0 };

describe("decideTurn — scale", () => {
  it("records a valid anchor immediately as sufficient", () => {
    expect(
      decideTurn({ ...base, question: scaleQ, scaleValue: 2 }),
    ).toEqual({ action: "record", answer: { type: "scale", value: 2 }, insufficient: false });
  });

  it("follows up while under the cap when no anchor maps", () => {
    expect(decideTurn({ ...base, question: scaleQ, scaleValue: null, followupsUsed: 0 })).toEqual({ action: "followup" });
    expect(decideTurn({ ...base, question: scaleQ, scaleValue: null, followupsUsed: 1 })).toEqual({ action: "followup" });
  });

  it("records an explicit null insufficient row at the cap, never an invented anchor", () => {
    expect(
      decideTurn({ ...base, question: scaleQ, scaleValue: null, followupsUsed: DEFAULT_FOLLOWUP_CAP }),
    ).toEqual({ action: "record", answer: { type: "scale", value: null }, insufficient: true });
  });
});

describe("decideTurn — open", () => {
  it("records the respondent's trimmed words when on topic", () => {
    expect(
      decideTurn({ ...base, question: openQ, addressesQuestion: true, currentText: "  справжня відповідь  " }),
    ).toEqual({ action: "record", answer: { type: "open", text: "справжня відповідь" }, insufficient: false });
  });

  it("follows up when off topic or empty and under the cap", () => {
    expect(decideTurn({ ...base, question: openQ, addressesQuestion: false, currentText: "не по темі", followupsUsed: 1 })).toEqual({ action: "followup" });
    expect(decideTurn({ ...base, question: openQ, addressesQuestion: true, currentText: "   ", followupsUsed: 0 })).toEqual({ action: "followup" });
  });

  it("records the best available text at the cap, flagged insufficient", () => {
    expect(
      decideTurn({ ...base, question: openQ, addressesQuestion: false, currentText: "ні", bestText: "найповніша спроба", followupsUsed: DEFAULT_FOLLOWUP_CAP }),
    ).toEqual({ action: "record", answer: { type: "open", text: "найповніша спроба" }, insufficient: true });
  });

  it("records an empty insufficient row when no usable text was ever given", () => {
    expect(
      decideTurn({ ...base, question: openQ, addressesQuestion: false, currentText: "", bestText: "", followupsUsed: DEFAULT_FOLLOWUP_CAP }),
    ).toEqual({ action: "record", answer: { type: "open", text: "" }, insufficient: true });
  });

  it("respects a custom cap", () => {
    expect(decideTurn({ ...base, question: openQ, addressesQuestion: false, currentText: "x", followupsUsed: 0, cap: 0 })).toEqual({
      action: "record",
      answer: { type: "open", text: "" },
      insufficient: true,
    });
  });
});
