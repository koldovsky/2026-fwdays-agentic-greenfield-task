// Pins the not-found boundaries (task 1.5) — FR-SHELL-01.
// The GLOBAL catch-all 404 (app/not-found.tsx) must render generic copy (any
// unknown route, not "a plant was not found"), while the PLANT-detail boundary
// (app/plants/[id]/not-found.tsx) renders the plant-specific copy. Both surface
// a friendly Ukrainian state with a link back to `/` — never a raw 500.
//
// @trace FR-SHELL-01
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import GlobalNotFound from "@/app/not-found";
import PlantNotFound from "@/app/plants/[id]/not-found";
import { uk } from "@/lib/i18n/uk";

afterEach(cleanup);

describe("global not-found boundary (FR-SHELL-01)", () => {
  it("renders the friendly not-found title", () => {
    render(<GlobalNotFound />);
    expect(screen.getByRole("heading", { name: uk.notFound.title })).toBeInTheDocument();
  });

  it("renders the GENERIC description, not the plant-specific copy", () => {
    render(<GlobalNotFound />);
    expect(screen.getByText(uk.notFound.genericDescription)).toBeInTheDocument();
    expect(screen.queryByText(uk.notFound.description)).toBeNull();
  });

  it("offers a link back to the list at /", () => {
    render(<GlobalNotFound />);
    expect(screen.getByRole("link", { name: uk.nav.backToList })).toHaveAttribute("href", "/");
  });
});

describe("plant-detail not-found boundary (FR-SHELL-01)", () => {
  it("renders the friendly not-found title", () => {
    render(<PlantNotFound />);
    expect(screen.getByRole("heading", { name: uk.notFound.title })).toBeInTheDocument();
  });

  it("renders the PLANT-specific description", () => {
    render(<PlantNotFound />);
    expect(screen.getByText(uk.notFound.description)).toBeInTheDocument();
    expect(screen.queryByText(uk.notFound.genericDescription)).toBeNull();
  });

  it("offers a link back to the list at /", () => {
    render(<PlantNotFound />);
    expect(screen.getByRole("link", { name: uk.nav.backToList })).toHaveAttribute("href", "/");
  });
});
