export interface IconButtonProps {
  /** Material Symbols Rounded icon name. */
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  /** accent = warm-orange (power/primary glyph); danger = red (disconnect/remove). */
  tone?: 'default' | 'accent' | 'danger';
  /** Forces the inset "pressed" look, e.g. for a currently-muted mute button. */
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
  style?: React.CSSProperties;
}
