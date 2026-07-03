// Render test for the tailor-workspace view (jsdom project), FR-SHELL-01/02 +
// FR-BULLETS-02 / BC-HONESTY-02. `TailoringForm` is mocked with a fake control
// that fires a scripted result on click — this keeps the workspace test
// focused on workspace behavior (empty state, rendering a result, toggling an
// overclaim bullet) rather than re-testing the form's streaming logic (that's
// TailoringForm.test.tsx's job).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { TailoringRunResult } from "@/features/run-tailoring";

import { TailorWorkspace } from "./TailorWorkspace";

const SCRIPTED_RESULT: TailoringRunResult = {
  checklist: [
    {
      requirement: {
        id: "req-react",
        text: "5+ years of commercial React experience",
        importance: "must-have",
        keywords: ["react"],
      },
      item: { status: "met", rationale: "The résumé confirms six years of React in production." },
    },
    {
      requirement: {
        id: "req-graphql",
        text: "GraphQL knowledge",
        importance: "nice-to-have",
        keywords: ["graphql"],
      },
      item: { status: "gap", rationale: "No mention of GraphQL in the résumé." },
    },
  ],
  bullets: [
    {
      id: "blt-platform",
      text: "Led development of a React platform serving 200k monthly users.",
      grounding: "grounded",
      includedInExport: true,
    },
    {
      id: "blt-team",
      text: "Led a team of ten engineers across three countries.",
      grounding: "overclaim-risk",
      includedInExport: false,
    },
  ],
  matchScore: 68,
};

vi.mock("@/features/run-tailoring", () => ({
  TailoringForm: ({ onResult }: { onResult: (result: TailoringRunResult) => void }) => (
    <button type="button" onClick={() => onResult(SCRIPTED_RESULT)}>
      fake tailor trigger
    </button>
  ),
}));

const overclaimBullet = SCRIPTED_RESULT.bullets.find((b) => b.grounding === "overclaim-risk")!;

async function triggerResult() {
  await userEvent.click(screen.getByRole("button", { name: "fake tailor trigger" }));
}

describe("TailorWorkspace (FR-SHELL-01/02)", () => {
  it("renders the empty state before any result", () => {
    render(<TailorWorkspace />);
    expect(screen.getByText(ua.workspace.emptyState)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: ua.result.regionLabel })).not.toBeInTheDocument();
  });

  it("renders the checklist score and bullets once a result arrives", async () => {
    render(<TailorWorkspace />);

    await triggerResult();

    expect(screen.getByText(String(SCRIPTED_RESULT.matchScore))).toBeInTheDocument();
    expect(screen.getByText(overclaimBullet.text)).toBeInTheDocument();
    expect(screen.queryByText(ua.workspace.emptyState)).not.toBeInTheDocument();
  });

  it("toggling an overclaim-risk bullet updates its included state", async () => {
    render(<TailorWorkspace />);
    await triggerResult();

    const row = screen.getByText(overclaimBullet.text).closest("li") as HTMLElement;
    const toggle = within(row).getByRole("checkbox");

    // Seeded excluded by default (BC-HONESTY-02).
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    // State flip re-renders the bullet as included.
    expect(within(row).getByRole("checkbox")).toBeChecked();
  });
});
