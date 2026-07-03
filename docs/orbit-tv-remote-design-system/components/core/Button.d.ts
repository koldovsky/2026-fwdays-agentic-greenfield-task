export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual treatment. primary = accent gradient (main CTA); secondary = flat neumorphic default; ghost = bordered, no shadow. */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Material Symbols Rounded icon name, rendered before the label. */
  icon?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
