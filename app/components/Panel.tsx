import type { ReactNode } from "react";

// A titled dashboard section: rounded border card with an optional serif title
// and a right-aligned meta slot. Groups the stats charts (user-stats).
export function Panel({
  title,
  subtitle,
  meta,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-6 ${className}`}>
      {(title || meta) && (
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            {title && <h2 className="font-serif text-h2">{title}</h2>}
            {subtitle && (
              <p className="mt-1 font-sans text-small text-text-muted">{subtitle}</p>
            )}
          </div>
          {meta && <span className="shrink-0 font-sans text-caption text-text-muted">{meta}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
