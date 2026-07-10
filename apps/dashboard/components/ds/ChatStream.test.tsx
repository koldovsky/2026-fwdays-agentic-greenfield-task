// @vitest-environment jsdom
// apps/dashboard/components/ds/ChatStream — renders a conversation's messages
// role-labelled (Лід / Школа) so the teacher can tell who said what, whether
// the messages arrived live over AG-UI (agent side) or were seeded from the
// persisted transcript on a page refresh (both sides).

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatStream } from "./ChatStream.tsx";

describe("ChatStream", () => {
  it("labels each bubble by role — Лід for the lead, Школа for the agent", () => {
    render(
      <ChatStream
        messages={[
          { id: "s0", role: "user", text: "Хочу записати доньку", streaming: false },
          { id: "s1", role: "assistant", text: "Радо! Як звати дитину?", streaming: false },
        ]}
      />,
    );

    expect(screen.getByText("Хочу записати доньку")).toBeTruthy();
    expect(screen.getByText("Радо! Як звати дитину?")).toBeTruthy();
    expect(screen.getAllByText("Лід").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Школа").length).toBeGreaterThan(0);
  });

  it("renders newest-first — the latest message is at the top, no scrolling to see it", () => {
    const { container } = render(
      <ChatStream
        messages={[
          { id: "s0", role: "user", text: "перше — найстаріше", streaming: false },
          { id: "s1", role: "assistant", text: "друге", streaming: false },
          { id: "s2", role: "assistant", text: "останнє — найновіше", streaming: false },
        ]}
      />,
    );

    const bubbleTexts = Array.from(container.querySelectorAll("p")).map((p) => p.textContent);
    expect(bubbleTexts[0]).toBe("останнє — найновіше");
    expect(bubbleTexts[bubbleTexts.length - 1]).toBe("перше — найстаріше");
  });

  it("shows the empty state when there are no messages and no active run", () => {
    render(<ChatStream messages={[]} />);
    expect(screen.getByText("Поки що тихо — розмов немає")).toBeTruthy();
  });
});
