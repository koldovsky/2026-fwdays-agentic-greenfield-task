// HistoryLockedView render (add-tailoring-history, FR-TAILOR-04): free-user gate.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { en, ua } from "@/shared/lib/i18n";

import { HistoryLockedView } from "./HistoryLockedView";

describe("HistoryLockedView", () => {
  it("explains history is paid-only and links to billing (Ukrainian-first)", () => {
    render(<HistoryLockedView />);
    expect(screen.getByRole("heading", { name: ua.history.lockedTitle })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ua.history.lockedCta })).toHaveAttribute(
      "href",
      "/account/billing",
    );
  });

  it("renders the English copy when locale=en", () => {
    render(<HistoryLockedView locale="en" />);
    expect(screen.getByRole("heading", { name: en.history.lockedTitle })).toBeInTheDocument();
  });
});
