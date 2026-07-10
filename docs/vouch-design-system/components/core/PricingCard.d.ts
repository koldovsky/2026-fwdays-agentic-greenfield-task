/**
 * Pricing tier card for Vouch's three plans.
 * Featured (Pro) card renders with ink background and elevated shadow.
 * FR-SALES-03
 */
export interface PricingCardProps {
  /** Tier name */
  tier?: string;
  /** Price string (e.g. "₴249", "₴0") */
  price?: string;
  /** Period string (e.g. "/ mo", "/ 30 days") — omit for one-time or free */
  period?: string;
  /** Feature list — string or { label, muted } for dimmed items */
  features?: Array<string | { label: string; muted?: boolean }>;
  /** CTA button label */
  cta?: string;
  /** When true, renders ink dark background — use for the recommended plan */
  featured?: boolean;
}
