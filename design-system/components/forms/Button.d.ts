export interface ButtonProps {
  /** Visual weight. 'primary' is the solid fg/bg pill used for main actions. */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  children?: import('react').ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: import('react').CSSProperties;
}
/**
 * @startingPoint section="Forms" subtitle="Primary action button" viewport="700x120"
 */
export function Button(props: ButtonProps): JSX.Element;
