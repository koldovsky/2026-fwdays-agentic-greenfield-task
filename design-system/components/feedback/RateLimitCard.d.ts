export interface RateLimitCardProps {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}
export function RateLimitCard(props: RateLimitCardProps): JSX.Element;
