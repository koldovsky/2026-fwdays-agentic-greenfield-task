// Sign-in form behavior (FR-AUTH-01): mode switch, credentials submit through
// Auth.js, and the uniform failure message that never reveals whether an email
// is registered.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { SignInForm } from "./SignInForm";

const signInMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signIn: signInMock }));

describe("SignInForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("renders sign-in mode by default with email and password fields", () => {
    render(<SignInForm />);
    expect(screen.getByRole("heading", { name: ua.auth.signInTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(ua.auth.emailLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(ua.auth.passwordLabel)).toBeInTheDocument();
    expect(screen.queryByLabelText(ua.auth.nameLabel)).not.toBeInTheDocument();
  });

  it("switches to sign-up mode and shows the optional name field", async () => {
    render(<SignInForm />);
    await userEvent.click(screen.getByRole("button", { name: ua.auth.signUpAction }));
    expect(screen.getByRole("heading", { name: ua.auth.signUpTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(ua.auth.nameLabel)).toBeInTheDocument();
  });

  it("submits credentials via Auth.js without a page-owned redirect on failure", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin", ok: false });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(ua.auth.emailLabel), "olena@example.com");
    await userEvent.type(screen.getByLabelText(ua.auth.passwordLabel), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: ua.auth.signInAction }));

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "olena@example.com",
      password: "correct-horse",
      redirect: false,
    });
    // Uniform copy — same for wrong password and unknown email (no enumeration).
    expect(await screen.findByRole("alert")).toHaveTextContent(
      ua.auth.error.invalidCredentials,
    );
  });
});
