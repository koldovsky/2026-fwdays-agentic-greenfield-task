// Sign-in form behavior (FR-AUTH-01): mode switch, credentials submit through
// Auth.js, and the uniform failure message that never reveals whether an email
// is registered.
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { SignInForm } from "./SignInForm";

const signInMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signIn: signInMock }));

const registerAccountMock = vi.hoisted(() => vi.fn());
vi.mock("../api/register", () => ({ registerAccount: registerAccountMock }));

describe("SignInForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
    registerAccountMock.mockReset();
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

  it("renders the honeypot only in sign-up mode", async () => {
    const { container } = render(<SignInForm />);
    expect(container.querySelector('input[name="website"]')).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: ua.auth.signUpAction }));
    expect(container.querySelector('input[name="website"]')).not.toBeNull();
  });

  it("silently drops a sign-up with a filled honeypot (NFR-SEC-04)", async () => {
    const { container } = render(<SignInForm />);
    await userEvent.click(screen.getByRole("button", { name: ua.auth.signUpAction }));

    await userEvent.type(screen.getByLabelText(ua.auth.emailLabel), "bot@example.com");
    await userEvent.type(screen.getByLabelText(ua.auth.passwordLabel), "long-enough-pass");
    // The honeypot is aria-hidden and off-screen — only a scripted submitter
    // fills it (fireEvent, since userEvent refuses hidden elements).
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    fireEvent.change(honeypot as HTMLInputElement, {
      target: { value: "https://spam.example" },
    });
    await userEvent.click(screen.getByRole("button", { name: ua.auth.signUpAction }));

    // Silent no-op: no register call, no session call, no error — nothing
    // distinguishes detection to the submitter.
    expect(registerAccountMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
