/**
 * Primary interaction control for Vouch UI.
 * Four visual variants (primary/secondary/ghost/dark), three sizes, disabled state.
 *
 * @startingPoint section="Components" subtitle="Buttons — all variants and sizes" viewport="700x180"
 */
export interface ButtonProps {
  /** Button text — alternative to children */
  label?: string;
  /** Button text as children */
  children?: React.ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state — prevents click, shows muted style */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}
