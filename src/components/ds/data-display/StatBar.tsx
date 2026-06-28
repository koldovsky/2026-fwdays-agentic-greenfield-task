import React from "react";

export interface StatBarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number;
  max?: number;
}

export function StatBar({
  label,
  value = 0,
  max = 255,
  className = "",
  ...rest
}: StatBarProps): React.ReactElement {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tier = value >= 100 ? "high" : value >= 60 ? "mid" : "low";
  const classes = ["ds-stat", `ds-stat--${tier}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      <span className="ds-stat__label">{label}</span>
      <span className="ds-stat__value">{value}</span>
      <span
        className="ds-stat__track"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <span className="ds-stat__fill" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
