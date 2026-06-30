// RED (Phase 4b) — tests written from the spec BEFORE the implementation exists.
// Pins the shared <FieldError> component (design.md D4): given a field id and an
// optional message, renders nothing when empty; when present renders a
// <p id="{fieldId}-error" role="alert"> carrying the Ukrainian message, so the
// owning input can wire aria-describedby="{fieldId}-error" (NFR-A11Y-04).
// Imports will fail until components/forms/FieldError.tsx is built.
//
// @trace FR-SHELL-03
// @trace NFR-A11Y-04
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldError } from "@/components/forms/FieldError";

afterEach(cleanup);

describe("<FieldError>", () => {
  it("renders nothing when there is no error message", () => {
    const { container } = render(<FieldError id="name" message={undefined} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders nothing when the message is an empty string", () => {
    const { container } = render(<FieldError id="name" message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Ukrainian message when present", () => {
    render(<FieldError id="name" message="Вкажіть назву рослини" />);
    expect(screen.getByText("Вкажіть назву рослини")).toBeInTheDocument();
  });

  it("uses the {id}-error element id so the field can aria-describedby it", () => {
    render(<FieldError id="name" message="Вкажіть назву рослини" />);
    const el = screen.getByText("Вкажіть назву рослини");
    // Convention (design.md D4): every field's error element id is `{id}-error`.
    expect(el).toHaveAttribute("id", "name-error");
  });

  it("derives the error id from the given field id (different field)", () => {
    render(<FieldError id="height" message="Значення має бути числом" />);
    expect(screen.getByText("Значення має бути числом")).toHaveAttribute("id", "height-error");
  });

  it("exposes the error to assistive tech via role=alert", () => {
    render(<FieldError id="name" message="Вкажіть назву рослини" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Вкажіть назву рослини");
    expect(alert).toHaveAttribute("id", "name-error");
  });
});
