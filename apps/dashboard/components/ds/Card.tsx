// apps/dashboard/components/ds — Card (dashboard tasks.md §6.3, DESIGN.md
// "Tokens": cards use `--radius-lg` (16px), the request card its own
// `--radius-xl` (20px) — `RequestCard` passes `raised` for that case.

import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function Card({ raised = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`border border-border bg-surface ${raised ? "rounded-xl shadow-sm bg-surface-raised" : "rounded-lg"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
