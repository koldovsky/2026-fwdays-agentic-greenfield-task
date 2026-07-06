// @vitest-environment jsdom
// Test-first (red): `statusTone`/`StatusBadge` are typed throwing stubs
// (dashboard tasks.md §6.4's red half) — every test below is expected to
// FAIL against the stub until the green half implements the real mapping.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { statusTone } from "./statusTone.ts";
import { StatusBadge } from "./StatusBadge.tsx";

describe("statusTone (dashboard tasks.md §6.4)", () => {
  // @trace FR-DASH-03
  it("maps pending to the amber token set", () => {
    const tone = statusTone("pending");
    expect(tone.icon).toBe("pending");
    expect(tone.bg).toContain("--status-pending-bg");
    expect(tone.fg).toContain("--status-pending-fg");
    expect(tone.solid).toContain("--status-pending-solid");
  });

  it("maps confirmed to the deep-green token set", () => {
    const tone = statusTone("confirmed");
    expect(tone.icon).toBe("confirmed");
    expect(tone.bg).toContain("--status-confirmed-bg");
  });

  it("maps declined to the muted-rose token set", () => {
    const tone = statusTone("declined");
    expect(tone.icon).toBe("declined");
    expect(tone.bg).toContain("--status-declined-bg");
  });

  it("maps cancelled to the quiet-slate token set", () => {
    const tone = statusTone("cancelled");
    expect(tone.icon).toBe("cancelled");
    expect(tone.bg).toContain("--status-cancelled-bg");
  });

  it("gives every status a non-empty Ukrainian label", () => {
    for (const status of ["pending", "confirmed", "declined", "cancelled"] as const) {
      expect(statusTone(status).label.length).toBeGreaterThan(0);
    }
  });
});

describe("StatusBadge (dashboard tasks.md §6.4)", () => {
  it("renders the pending label and icon", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText(statusTone("pending").label)).toBeInTheDocument();
  });

  it("renders a distinct label per status (four mappings, not one fallback)", () => {
    const labels = (["pending", "confirmed", "declined", "cancelled"] as const).map(
      (status) => statusTone(status).label,
    );
    expect(new Set(labels).size).toBe(4);
  });
});
