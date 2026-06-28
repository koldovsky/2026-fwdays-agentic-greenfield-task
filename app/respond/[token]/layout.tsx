import type { ReactNode } from "react";

/**
 * The respondent shell (FR-SHELL-02). Deliberately bare so it cannot leak
 * cabinet chrome: no sidebar, no cabinet navigation, no wordmark or link into
 * the cabinet, and no HR user control. It provides only the sidebar-free,
 * mobile-first centered column capped at 640px (`--content-narrow`); it spans
 * the viewport at narrower widths.
 *
 * The respondent header content — the assessment context (who is assessed and
 * the assessment name) — is owned by the respond/form/interview slices and is
 * not known at this layout, so the page fills the entire column via `children`.
 * Token auth for `/respond/*` is likewise owned by those slices.
 */
export default async function RespondLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="mx-auto w-full max-w-[var(--content-narrow)] flex-1 px-[var(--space-7)] py-[var(--space-9)]">
        {children}
      </main>
    </div>
  );
}
