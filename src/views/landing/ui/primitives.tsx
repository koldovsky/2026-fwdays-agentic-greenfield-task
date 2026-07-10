// Slice-local presentational primitives for the landing view.
// Token-driven, server-safe. No icon libraries, no SVG icon paths (BC-BRAND-01).
import type { ReactNode } from "react";

/** Centered max-width content column. */
export function Wrap({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1080px] px-6 ${className}`}>{children}</div>
  );
}

/** Monospace, uppercase, tracked eyebrow label. */
export function Kicker({ children }: { readonly children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
      {children}
    </span>
  );
}

/** Section heading block: kicker + h2 + optional lead. */
export function SectionHead({
  kicker,
  title,
  lead,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly lead?: string;
}) {
  return (
    <div className="mb-9 max-w-[36em]">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-normal text-ink sm:text-3xl">
        {title}
      </h2>
      {lead !== undefined && (
        <p className="mt-3 text-md leading-relaxed text-ink-soft">{lead}</p>
      )}
    </div>
  );
}
