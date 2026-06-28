"use client";

import React from "react";

export interface PaginationProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  siblingCount?: number;
}

const ChevL = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevR = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

function pageModel(current: number, total: number, siblings = 1): (number | "…")[] {
  const out: (number | "…")[] = [];
  const left = Math.max(2, current - siblings);
  const right = Math.min(total - 1, current + siblings);
  out.push(1);
  if (left > 2) out.push("…");
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push("…");
  if (total > 1) out.push(total);
  return out;
}

export function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  className = "",
  ...rest
}: PaginationProps): React.ReactElement {
  const go = (p: number) => {
    if (onPageChange && p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };
  const model = pageModel(page, totalPages, siblingCount);
  return (
    <nav className={["ds-pager", className].filter(Boolean).join(" ")} aria-label="Pagination" {...rest}>
      <button className="ds-pager__btn" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}>
        <ChevL />
      </button>
      {model.map((p, i) =>
        p === "…"
          ? <span key={`e${i}`} className="ds-pager__ellipsis">…</span>
          : (
            <button
              key={p}
              className="ds-pager__btn"
              aria-current={p === page ? "page" : undefined}
              onClick={() => go(p as number)}
            >
              {p}
            </button>
          )
      )}
      <button className="ds-pager__btn" aria-label="Next page" disabled={page >= totalPages} onClick={() => go(page + 1)}>
        <ChevR />
      </button>
    </nav>
  );
}
