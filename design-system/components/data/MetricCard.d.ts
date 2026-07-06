export interface MetricCardProps {
  label: string;
  /** Preformatted display value, e.g. "5.6k", "42", "5y". */
  value: string | number;
}
/**
 * @startingPoint section="Data" subtitle="Single labelled metric" viewport="220x110"
 */
export function MetricCard(props: MetricCardProps): JSX.Element;
