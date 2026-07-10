// Behavior of the clarify step (FR-WIZARD-03): each question can be answered,
// skipped, or declined; proceeding is never blocked; an untouched question
// submits as skipped. The component only collects and emits answers — it makes
// no network call.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { ClarifyingQuestion } from "@/entities/clarifying-question";

import { ClarifyingQuestions } from "./ClarifyingQuestions";

const QUESTIONS: readonly ClarifyingQuestion[] = [
  { id: "qa", requirementText: "GraphQL", text: "Do you have GraphQL experience?" },
  { id: "qb", requirementText: "Kubernetes", text: "Have you run production Kubernetes?" },
];

function itemFor(text: string): HTMLElement {
  return screen.getByText(text).closest("li") as HTMLElement;
}
async function submit() {
  await userEvent.click(screen.getByRole("button", { name: ua.wizard.clarifySubmitAction }));
}

describe("ClarifyingQuestions (FR-WIZARD-03)", () => {
  it("emits an answered entry for a typed question and skipped for an untouched one", async () => {
    const onSubmit = vi.fn();
    render(<ClarifyingQuestions questions={QUESTIONS} onSubmit={onSubmit} />);

    await userEvent.type(
      within(itemFor(QUESTIONS[0].text)).getByRole("textbox"),
      "Two years on a public API",
    );
    await submit();

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: "qa", status: "answered", answerText: "Two years on a public API" },
      { questionId: "qb", status: "skipped" },
    ]);
  });

  it("records skip and decline choices", async () => {
    const onSubmit = vi.fn();
    render(<ClarifyingQuestions questions={QUESTIONS} onSubmit={onSubmit} />);

    await userEvent.click(
      within(itemFor(QUESTIONS[0].text)).getByRole("button", { name: ua.wizard.skipAction }),
    );
    await userEvent.click(
      within(itemFor(QUESTIONS[1].text)).getByRole("button", { name: ua.wizard.declineAction }),
    );
    await submit();

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: "qa", status: "skipped" },
      { questionId: "qb", status: "declined" },
    ]);
  });

  it("never blocks: submitting with nothing touched skips every question", async () => {
    const onSubmit = vi.fn();
    render(<ClarifyingQuestions questions={QUESTIONS} onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: ua.wizard.clarifySubmitAction });
    expect(button).not.toBeDisabled();
    await submit();

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: "qa", status: "skipped" },
      { questionId: "qb", status: "skipped" },
    ]);
  });

  it("disables a question's textarea once it is skipped, and re-enables on toggle", async () => {
    render(<ClarifyingQuestions questions={QUESTIONS} onSubmit={vi.fn()} />);
    const item = itemFor(QUESTIONS[0].text);
    const skip = within(item).getByRole("button", { name: ua.wizard.skipAction });

    await userEvent.click(skip);
    expect(within(item).getByRole("textbox")).toBeDisabled();
    expect(within(item).getByText(ua.wizard.skippedLabel)).toBeInTheDocument();

    await userEvent.click(skip); // toggle off
    expect(within(item).getByRole("textbox")).not.toBeDisabled();
  });
});
