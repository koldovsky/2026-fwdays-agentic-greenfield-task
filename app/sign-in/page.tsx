import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { uk } from "@/lib/i18n/uk";

export const metadata: Metadata = {
  title: "Вхід — Kolo360",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next ?? null);
  const t = uk.auth;

  return (
    <main className="flex flex-1 items-center justify-center px-[var(--space-8)] py-[var(--space-11)]">
      <div
        className="w-full max-w-[400px] rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-11)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-[var(--space-10)] flex flex-col gap-[var(--space-4)]">
          <span className="text-[var(--text-xl)] font-[var(--weight-semibold)] tracking-tight text-ink">
            Kolo360
          </span>
          <h1 className="text-[var(--text-lg)] text-ink">{t.signInTitle}</h1>
          <p className="text-ink-muted">{t.signInSubtitle}</p>
        </div>

        <SignInForm next={safeNext} />
      </div>
    </main>
  );
}
