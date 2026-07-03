// usage-counter entity — per-user tailoring usage for rate/cost control
// (NFR-COST-02, FR-PAYWALL-01). Pure model, framework-free (TC-PURE-01).

export interface UsageCounter {
  readonly userId: string;
  /** Lifetime count of completed (charged) tailorings. */
  readonly tailoringsUsed: number;
}

/** Account tier for gating: anonymous visitor, free account, or paid. */
export type AccountKind = "anonymous" | "free" | "paid";
