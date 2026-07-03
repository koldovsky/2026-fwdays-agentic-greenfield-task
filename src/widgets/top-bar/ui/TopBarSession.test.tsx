// Client session island (FR-SHELL-01, add-agent-loop landing fix): the landing
// route stays static (NFR-PERF-04) so the session is read client-side via
// next-auth/react's useSession instead of server-side auth().
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { TopBarSession } from "./TopBarSession";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: useSessionMock,
}));

describe("TopBarSession", () => {
  it("renders the signed-in state with the session user's name when authenticated", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { name: "Olena", email: "olena@example.com" } },
    });

    render(<TopBarSession />);

    expect(screen.getByText("Olena")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.auth.signOutAction })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ua.topBar.signIn })).not.toBeInTheDocument();
  });

  it("renders sign-in and try-free CTAs when unauthenticated", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null });

    render(<TopBarSession />);

    expect(screen.getByRole("link", { name: ua.topBar.signIn })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: ua.topBar.tryFree })).toHaveAttribute(
      "href",
      "/tailor",
    );
    expect(
      screen.queryByRole("button", { name: ua.auth.signOutAction }),
    ).not.toBeInTheDocument();
  });

  it("renders the same anonymous state while loading, with no crash or broken UI", () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null });

    render(<TopBarSession />);

    expect(screen.getByRole("link", { name: ua.topBar.signIn })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ua.topBar.tryFree })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ua.auth.signOutAction }),
    ).not.toBeInTheDocument();
  });
});
