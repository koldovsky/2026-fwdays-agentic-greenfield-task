import React from "react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const DefaultGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);

export function EmptyState({
  icon,
  title = "No Pokémon found",
  description,
  action,
  className = "",
  ...rest
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={["ds-empty", className].filter(Boolean).join(" ")} {...rest}>
      <span className="ds-empty__icon">{icon || <DefaultGlyph />}</span>
      <div className="ds-empty__title">{title}</div>
      {description ? <div className="ds-empty__desc">{description}</div> : null}
      {action ? <div className="ds-empty__actions">{action}</div> : null}
    </div>
  );
}
