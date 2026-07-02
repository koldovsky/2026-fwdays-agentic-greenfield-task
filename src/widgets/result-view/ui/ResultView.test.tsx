// Render tests for the result-view layout widget (jsdom project), FR-SHELL-01/02.
// result-view is layout-only: it renders whatever `left`/`right` slots it is
// given plus the shared frame. The test uses plain slot stubs so the widgets
// layer stays free of any widget->widget import — real child widgets are
// composed in the VIEW (tailor-workspace), which is allowed to import widgets.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { ResultView } from "./ResultView";

describe("ResultView (FR-SHELL-01/02)", () => {
  it("renders both the left and right slots", () => {
    render(
      <ResultView
        left={<div>left-slot-content</div>}
        right={<div>right-slot-content</div>}
      />,
    );
    expect(screen.getByText("left-slot-content")).toBeInTheDocument();
    expect(screen.getByText("right-slot-content")).toBeInTheDocument();
  });

  it("renders the shared frame header from centralized copy", () => {
    render(<ResultView left={<div />} right={<div />} />);
    expect(screen.getByText(ua.result.title)).toBeInTheDocument();
  });

  it("exposes both columns inside a labelled result region", () => {
    render(
      <ResultView
        left={<div>col-a</div>}
        right={<div>col-b</div>}
      />,
    );
    const region = screen.getByRole("region", { name: ua.result.regionLabel });
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent("col-a");
    expect(region).toHaveTextContent("col-b");
  });
});
